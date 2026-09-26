#!/usr/bin/env node
import {
  createIncident,
  createWorkItem,
  findRepoRoot,
  loadSnapshot,
} from '../../core/src/index.mjs';

const root = await findRepoRoot();
const [command, ...args] = process.argv.slice(2);

function value(flag, fallback = '') {
  const index = args.indexOf(flag);
  return index >= 0 ? (args[index + 1] ?? fallback) : fallback;
}

if (!command || command === 'help') {
  console.log(`agents-company commands:
  snapshot
  new-work --title "..." [--objective "..."] [--priority high]
  incident --title "..." --symptom "..." [--severity high]`);
  process.exit(0);
}

if (command === 'snapshot') {
  console.log(JSON.stringify(await loadSnapshot(root), null, 2));
} else if (command === 'new-work') {
  const item = await createWorkItem(root, {
    title:value('--title','Untitled Work Item'),
    objective:value('--objective',''),
    priority:value('--priority','medium'),
    acceptanceCriteria:value('--accept') ? [value('--accept')] : [],
  });
  console.log(item.id);
} else if (command === 'incident') {
  const incident = await createIncident(root, {
    title:value('--title','Untitled Incident'),
    symptom:value('--symptom',''),
    severity:value('--severity','medium'),
    detectedBy:'human',
  });
  console.log(incident.id);
} else {
  throw new Error('Unknown command: ' + command);
}
