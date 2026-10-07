import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawnSync, execSync } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCK_FILE = path.join(__dirname, '.omnihub-setup-done');
const ENV_FILE = path.join(__dirname, '.env');
const DOCKER_FILE = path.join(__dirname, 'docker-compose.yml');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function checkGPU() {
  try {
    const output = execSync('nvidia-smi --query-gpu=name --format=csv,noheader', { encoding: 'utf8' });
    return output.trim();
  } catch (e) {
    return 'No NVIDIA GPU Detected / nvidia-smi not found';
  }
}

async function runSetup() {
  console.log("============================================================");
  console.log("              OMNIHUB INSTALLATION WIZARD                   ");
  console.log("============================================================");
  console.log(`OS Detected: ${os.type()} ${os.release()} (${os.arch()})`);
  const gpu = await checkGPU();
  console.log(`GPU Detected: ${gpu}\n`);

  console.log("[INFORMASI PENTING SEBELUM MEMULAI]");
  console.log("- Mode Docker: Memerlukan Docker, Docker-Compose, & NVIDIA Container Toolkit (untuk Linux).");
  console.log("- Mode Monolitik: Memerlukan Node.js v18+, MySQL Server, dan FFmpeg terinstal di OS ini.\n");

  console.log("Pilih mode deployment:");
  console.log("1. Docker (Fully Containerized + Auto MySQL)");
  console.log("2. Monolithic (Bare-Metal Local Node.js + Local MySQL)");
  console.log("3. Keluar dari Setup");
  
  let mode = '';
  while (mode !== '1' && mode !== '2' && mode !== '3') {
    mode = await question("\nPilih (1/2/3): ");
  }

  if (mode === '3') {
    console.log("Setup dibatalkan. Keluar...");
    rl.close();
    process.exit(0);
  }

  console.log("\n--- KONFIGURASI DATABASE ---");
  let dbName = await question("Masukkan Nama Database [Tekan Enter untuk default: omnihub_db]: ");
  if (!dbName.trim()) dbName = 'omnihub_db';

  let dbUser = '';
  while (!dbUser.trim()) {
    dbUser = await question("Masukkan Username MySQL (Wajib diisi): ");
  }

  let dbPass = '';
  while (!dbPass.trim()) {
    dbPass = await question("Masukkan Password MySQL (Wajib diisi): ");
  }

  // Create .env
  const envContent = `
DB_HOST=${mode === '1' ? 'mysql_db' : 'localhost'}
DB_USER=${dbUser.trim()}
DB_PASS=${dbPass.trim()}
DB_NAME=${dbName.trim()}
APP_PORT=3000
JWT_SECRET=OmniHub_Super_Secret_Key_2026_!@#_Permanent_Lock
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
`;
  fs.writeFileSync(ENV_FILE, envContent.trim());
  console.log("\n[SUCCESS] File .env berhasil di-generate.");

  if (mode === '1') {
    // Create docker-compose.yml with NVIDIA integration
    const dockerCompose = `
version: '3.8'
services:
  omnihub_app:
    build: .
    ports:
      - "3000:3000"
      - "1935:1935"
      - "8005:8005"
    environment:
      - DB_HOST=mysql_db
      - DB_USER=${dbUser.trim()}
      - DB_PASS=${dbPass.trim()}
      - DB_NAME=${dbName.trim()}
    depends_on:
      - mysql_db
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu, video]

  mysql_db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${dbPass.trim()}
      MYSQL_DATABASE: ${dbName.trim()}
      MYSQL_USER: ${dbUser.trim()}
      MYSQL_PASSWORD: ${dbPass.trim()}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
`;
    fs.writeFileSync(DOCKER_FILE, dockerCompose.trim());
    console.log("[SUCCESS] File docker-compose.yml berhasil di-generate dengan binding NVENC GPU.");
  }

  // Create Lock File
  fs.writeFileSync(LOCK_FILE, "SETUP_COMPLETED=true\nMODE=" + (mode === '1' ? 'DOCKER' : 'MONOLITHIC'));
  console.log("\n[SUCCESS] Setup OmniHub Selesai! Mengunci konfigurasi...");
  console.log("Menjalankan server sekarang...\n");
  rl.close();
  startApp(mode === '1' ? 'DOCKER' : 'MONOLITHIC');
}

function startApp(mode) {
  if (mode === 'DOCKER') {
    console.log("Menjalankan Docker Compose di background...");
    spawnSync('docker-compose', ['up', '-d'], { stdio: 'inherit', shell: true });
    console.log("\\n[SYSTEM] OmniHub berjalan di Docker! Akses http://localhost:3000");
  } else {
    console.log("Menjalankan server Node.js Monolitik menggunakan tsx...");
    // Mengeksekusi server.ts menggunakan 'tsx' (Kompatibel untuk Node 20/22+ ESM)
    spawnSync('npx', ['tsx', 'server.ts'], { stdio: 'inherit', shell: true });
  }
}

// MAIN ENTRY POINT
if (!fs.existsSync(LOCK_FILE)) {
  runSetup();
} else {
  const lockData = fs.readFileSync(LOCK_FILE, 'utf-8');
  const mode = lockData.includes('MODE=DOCKER') ? 'DOCKER' : 'MONOLITHIC';
  startApp(mode);
}
