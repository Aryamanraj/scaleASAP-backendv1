export const QueueNames = {
  NEW_LOGS: 'new-logs', // handle web3 interaction logs updates
  LATE_LOGS: 'late-logs', //handle late log web3 interactions
  MODULE_RUNS: 'module-runs', // handle module run executions
};

// list of queues
export const Queues = [
  QueueNames.NEW_LOGS,
  QueueNames.LATE_LOGS,
  QueueNames.MODULE_RUNS,
];

export const QUEUE_JOB_NAMES = {
  PONG_TRANSACTION: 'pong-queue', //job name for sending pong
  LATE_PONG_TRANSACTION: 'late-pong-queue', //job name for sending pong
  EXECUTE_MODULE_RUN: 'execute-module-run', //job name for executing module runs
};

export const CRON_JOB_NAMES = {
  CRONS_HEALTH_CHECKER: 'crons-health-checker',
  LATE_SEND_PONG: 'late-send-pong-cron',
};

export const CUTOFF_TIME = 10 * 60; // 10 mintues
