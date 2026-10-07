import { spawn } from 'child_process';
const proc = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'testsrc=duration=1:size=320x240:rate=30', '-progress', 'pipe:2', '-nostats', '-f', 'null', '-']);
proc.stderr.on('data', (d) => process.stdout.write(d.toString()));
