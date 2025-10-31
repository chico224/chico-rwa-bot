'use strict';

class TaskRouter {
  initialize() {}

  async integrateRoutingInTasks(userJid, sock, context, withScaling = true) {
    // Placeholder: simuler 3 tâches rapides
    await sock.sendMessage(userJid, { text: 'Tâche 1/30: Préparation...' });
    await sock.sendMessage(userJid, { text: 'Tâche 2/30: Vérification wallet...' });
    await sock.sendMessage(userJid, { text: `Tâche 3/30: Démarrage${withScaling ? ' avec scaling' : ''}...` });
  }
}

module.exports = { TaskRouter };
