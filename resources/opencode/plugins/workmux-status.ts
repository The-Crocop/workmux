import type { Plugin } from '@opencode-ai/plugin';

export const WorkmuxStatusPlugin: Plugin = async ({ $ }) => {
  try {
    await $`workmux register-agent`.quiet();
  } catch {
    // Status tracking remains available when registration cannot reach workmux.
  }

  // OpenCode can emit repeated `session.status busy` events for a single turn,
  // and can even emit a stale trailing `busy` after `idle` at the end. Track
  // every parent and child session so one idle session cannot mark the whole
  // pane done while another session is still working.
  const statusBySession = new Map<string, string>();
  const acceptBusyBySession = new Map<string, boolean>();
  const deletedSessions = new Set<string>();
  const childSessions = new Set<string>();
  const lastUserMessageBySession = new Map<string, string>();
  const currentPromptMessageBySession = new Map<string, string>();
  const promptPartsByMessage = new Map<string, Map<string, string>>();
  let reportedStatus: string | undefined;
  let statusQueue = Promise.resolve();

  function writeStatus(status: string) {
    return $`workmux set-window-status ${status}`.quiet().then(() => {}, () => {});
  }

  function writePrompt(prompt: string) {
    return $`workmux set-window-status working --prompt ${prompt}`
      .quiet()
      .then(() => {}, () => {});
  }

  function queueStatus(status: string) {
    statusQueue = statusQueue.then(
      () => writeStatus(status),
      () => writeStatus(status),
    );
    return statusQueue;
  }

  function queuePrompt(prompt: string) {
    statusQueue = statusQueue.then(
      () => writePrompt(prompt),
      () => writePrompt(prompt),
    );
    return statusQueue;
  }

  async function reportAggregateStatus() {
    const statuses = [...statusBySession.values()];
    let status = 'done';

    if (statuses.includes('waiting')) {
      status = 'waiting';
    } else if (statuses.includes('working')) {
      status = 'working';
    }

    if (reportedStatus === status) {
      return;
    }

    reportedStatus = status;
    await queueStatus(status);
  }

  async function setStatus(
    sessionID: string | undefined,
    status: string,
  ) {
    if (!sessionID || deletedSessions.has(sessionID)) {
      return;
    }

    const previous = statusBySession.get(sessionID);
    if (status === 'done' && previous === undefined) {
      return;
    }
    // Ignore the final stale `busy` OpenCode sometimes emits after a session is
    // already done. The next user message re-arms `working` for the new turn.
    if (status === 'working' && acceptBusyBySession.get(sessionID) === false) {
      return;
    }
    if (previous === status) {
      return;
    }

    statusBySession.set(sessionID, status);
    if (status === 'done') {
      acceptBusyBySession.set(sessionID, false);
    } else {
      acceptBusyBySession.set(sessionID, true);
    }

    await reportAggregateStatus();
  }

  return {
    event: async ({ event }) => {
      if (event.type === 'session.created' || event.type === 'session.updated') {
        const info = event.properties.info;
        if (info.parentID) {
          childSessions.add(info.id);
        } else {
          childSessions.delete(info.id);
        }
      }

      if (event.type === 'message.updated' && event.properties.info.role === 'user') {
        const info = event.properties.info;
        const previousUserMessageID = lastUserMessageBySession.get(info.sessionID);

        // OpenCode may emit message.updated repeatedly for the same user message.
        // Only a genuinely new user message should re-arm lifecycle tracking.
        if (previousUserMessageID === info.id) {
          return;
        }

        lastUserMessageBySession.set(info.sessionID, info.id);
        acceptBusyBySession.set(info.sessionID, true);

        if (!childSessions.has(info.sessionID)) {
          const previousPromptMessageID = currentPromptMessageBySession.get(info.sessionID);
          if (previousPromptMessageID) {
            promptPartsByMessage.delete(previousPromptMessageID);
          }
          currentPromptMessageBySession.set(info.sessionID, info.id);
          promptPartsByMessage.set(info.id, new Map());
        }

        await setStatus(info.sessionID, 'working');
      }

      if (event.type === 'message.part.updated') {
        const part = event.properties.part;
        if (
          part.type === 'text' &&
          !part.synthetic &&
          !part.ignored &&
          acceptBusyBySession.get(part.sessionID) !== false &&
          currentPromptMessageBySession.get(part.sessionID) === part.messageID
        ) {
          const parts = promptPartsByMessage.get(part.messageID) ?? new Map<string, string>();
          parts.set(part.id, part.text);
          promptPartsByMessage.set(part.messageID, parts);
          const prompt = [...parts.values()].join('\n').trim();
          if (prompt) {
            await queuePrompt(prompt);
          }
        }
      }

      switch (event.type) {
        case 'session.status':
          if (event.properties.status.type === 'busy') {
            await setStatus(event.properties.sessionID, 'working');
          }
          if (event.properties.status.type === 'idle') {
            await setStatus(event.properties.sessionID, 'done');
          }
          break;
        case 'permission.asked':
        case 'question.asked':
          await setStatus(event.properties.sessionID, 'waiting');
          break;
        case 'permission.replied':
        case 'question.replied':
          await setStatus(event.properties.sessionID, 'working');
          break;
        case 'session.idle':
          await setStatus(event.properties.sessionID, 'done');
          break;
        case 'session.deleted': {
          const sessionID = event.properties.info.id;
          deletedSessions.add(sessionID);
          childSessions.delete(sessionID);
          acceptBusyBySession.delete(sessionID);
          lastUserMessageBySession.delete(sessionID);
          const promptMessageID = currentPromptMessageBySession.get(sessionID);
          currentPromptMessageBySession.delete(sessionID);
          if (promptMessageID) {
            promptPartsByMessage.delete(promptMessageID);
          }
          if (statusBySession.delete(sessionID)) {
            await reportAggregateStatus();
          }
          break;
        }
      }
    },
  };
};
