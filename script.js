/* =====================================================
   DAYAKBELAJAR - GAME MEMASANGKAN KOSAKATA
   Kosakata dimuat dari kosakata.json.
   Jalankan menggunakan VS Code Live Server.
   ===================================================== */

const FILE_KOSAKATA = "./kosakata.json";
const JUMLAH_PASANGAN = 8; // jumlah pasangan untuk level pertama
const JUMLAH_PER_LEVEL = [8, 10, 12];
const POIN_BENAR = 10;
const WAKTU_TAMPIL_SALAH = 650;

let dataKosakata = [];
let soalAktif = [];
let daftarIndonesiaAktif = [];
let skor = 0;
let levelAktif = 1;
let levelTerbuka = 1;
let pasanganBenar = new Set();
let warnaPasangan = new Map();
let pilihanDayak = null;
let pilihanIndonesia = null;
let pasanganSalah = [];
let sedangMemeriksa = false;
let timerSalah = null;
let timerPesan = null;
let timerSelesai = null;

const $ = (id) => document.getElementById(id);

const homeScreen = $("homeScreen");
const gameScreen = $("gameScreen");
const finishScreen = $("finishScreen");
const startButton = $("startButton");
const backButton = $("backButton");
const resetButton = $("resetButton");
const replayButton = $("replayButton");
const finishBackButton = $("finishBackButton");
const nextLevelButton = $("nextLevelButton");
const levelNumber = $("levelNumber");
const dayakColumn = $("dayakColumn");
const indonesiaColumn = $("indonesiaColumn");
const gameMessage = $("gameMessage");
const gameContainer = $("gameContainer");
const loadMessage = $("loadMessage");
const gamePoints = $("gamePoints");
const scoreBottom = $("scoreBottom");
const progressBar = $("progressBar");
const progressText = $("progressText");
const finalPoints = $("finalPoints");
const finishSummary = $("finishSummary");
const homeHeaderPointsStat = $("homeHeaderPointsStat");
const homeCountBadge = $("homeCountBadge");
const homeWordsStat = $("homeWordsStat");
const homePointsStat = $("homePointsStat");
const homePairsStat = $("homePairsStat");
const homeProgressStat = $("homeProgressStat");

function acakDaftar(data) {
  const hasil = [...data];
  for (let i = hasil.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

function buatWarnaPasangan(daftar) {
  const hasil = new Map();
  const total = Math.max(daftar.length, 1);
  daftar.forEach((kata, indeks) => {
    const hue = Math.round((indeks * 360) / total);
    hasil.set(kata.id, {
      latar: `hsl(${hue}, 75%, 92%)`,
      garis: `hsl(${hue}, 42%, 60%)`,
      teks: `hsl(${hue}, 48%, 27%)`
    });
  });
  return hasil;
}

function tampilkanHalaman(halamanAktif) {
  [homeScreen, gameScreen, finishScreen].forEach((halaman) => {
    if (!halaman) return;
    const aktif = halaman === halamanAktif;
    halaman.classList.toggle("active", aktif);
    halaman.hidden = !aktif;
  });
  window.scrollTo({ top: 0, behavior: "auto" });
}

function perbaruiStatistikBeranda() {
  const total = soalAktif.length || Math.min(JUMLAH_PASANGAN, dataKosakata.length);
  const benar = pasanganBenar.size;
  const persentase = total > 0 ? Math.round((benar / total) * 100) : 0;

  if (homeHeaderPointsStat) homeHeaderPointsStat.textContent = String(skor);
  if (homeCountBadge) {
    const badgeText = homeCountBadge.querySelector("span");
    if (badgeText) badgeText.textContent = `${dataKosakata.length} kosakata tersedia`;
  }
  if (homeWordsStat) homeWordsStat.textContent = String(dataKosakata.length);
  if (homePointsStat) homePointsStat.textContent = String(skor);
  if (homePairsStat) homePairsStat.textContent = `${benar}/${total || JUMLAH_PASANGAN}`;
  if (homeProgressStat) homeProgressStat.textContent = `${persentase}%`;
}

function perbaruiSkor() {
  if (gamePoints) gamePoints.textContent = String(skor);
  if (scoreBottom) scoreBottom.textContent = String(skor);
  perbaruiStatistikBeranda();
}

function perbaruiProgres() {
  const total = soalAktif.length || Math.min(JUMLAH_PASANGAN, dataKosakata.length);
  const selesai = pasanganBenar.size;
  const persentase = total > 0 ? (selesai / total) * 100 : 0;

  if (progressText) progressText.textContent = `${selesai}/${total || JUMLAH_PASANGAN}`;
  if (progressBar) progressBar.style.width = `${persentase}%`;
  perbaruiStatistikBeranda();
}

function tampilkanPesan(teks, jenis = "") {
  if (!gameMessage) return;
  window.clearTimeout(timerPesan);
  gameMessage.textContent = teks;
  gameMessage.className = "game-message";
  if (jenis) {
    gameMessage.classList.add(jenis, "visible");
    timerPesan = window.setTimeout(() => {
      gameMessage.classList.remove("visible");
    }, jenis === "success" ? 950 : 850);
  }
}

function buatKartu(kata, jenis) {
  const tombol = document.createElement("button");
  tombol.type = "button";
  tombol.className = "word-card";
  tombol.textContent = jenis === "dayak" ? kata.dayak : kata.indonesia;
  tombol.dataset.id = kata.id;
  tombol.dataset.side = jenis;

  const cocok = pasanganBenar.has(kata.id);
  const dipilih = jenis === "dayak"
    ? pilihanDayak === kata.id
    : pilihanIndonesia === kata.id;
  const salah = pasanganSalah.includes(`${jenis}:${kata.id}`);

  if (cocok) {
    tombol.classList.add("matched", "correct-pop");
    tombol.disabled = true;
    const warna = warnaPasangan.get(kata.id);
    if (warna) {
      tombol.style.backgroundColor = warna.latar;
      tombol.style.borderColor = warna.garis;
      tombol.style.color = warna.teks;
    }
  }
  if (dipilih && !cocok) tombol.classList.add("selected");
  if (salah && !cocok) tombol.classList.add("wrong", "wrong-shake");

  tombol.setAttribute("aria-pressed", dipilih ? "true" : "false");
  tombol.addEventListener("click", () => pilihKartu(kata.id, jenis));
  return tombol;
}

function gambarPapan() {
  if (!dayakColumn || !indonesiaColumn) {
    console.error("Kolom permainan tidak ditemukan di index.html.");
    return;
  }
  dayakColumn.replaceChildren();
  indonesiaColumn.replaceChildren();

  // Posisi kata tetap, tidak diacak setiap kali pemain memilih kartu.
  soalAktif.forEach((kata) => dayakColumn.appendChild(buatKartu(kata, "dayak")));
  daftarIndonesiaAktif.forEach((kata) => indonesiaColumn.appendChild(buatKartu(kata, "indonesia")));
}

function pilihKartu(id, jenis) {
  if (sedangMemeriksa || pasanganBenar.has(id)) return;

  // Pemain boleh mengganti pilihan pada kolom yang sama.
  if (jenis === "dayak") pilihanDayak = id;
  else pilihanIndonesia = id;

  pasanganSalah = [];
  gambarPapan();

  if (pilihanDayak !== null && pilihanIndonesia !== null) {
    periksaPasangan();
  } else {
    tampilkanPesan("Sekarang pilih kartu pasangannya.");
  }
}

function periksaPasangan() {
  if (pilihanDayak === null || pilihanIndonesia === null || sedangMemeriksa) return;

  if (pilihanDayak === pilihanIndonesia) {
    const idBenar = pilihanDayak;
    pasanganBenar.add(idBenar);
    skor += POIN_BENAR;
    pilihanDayak = null;
    pilihanIndonesia = null;
    pasanganSalah = [];

    perbaruiSkor();
    perbaruiProgres();
    gambarPapan();
    tampilkanPesan(`🎉 Benar! +${POIN_BENAR} poin. Tingang ikut senang!`, "success");

    if (pasanganBenar.size === soalAktif.length) {
      timerSelesai = window.setTimeout(selesaikanPermainan, 550);
    }
    return;
  }

  sedangMemeriksa = true;
  pasanganSalah = [`dayak:${pilihanDayak}`, `indonesia:${pilihanIndonesia}`];
  gambarPapan();
  tampilkanPesan("Belum cocok! Coba lagi, kamu pasti bisa. 🪶", "error");

  timerSalah = window.setTimeout(() => {
    pilihanDayak = null;
    pilihanIndonesia = null;
    pasanganSalah = [];
    sedangMemeriksa = false;
    gambarPapan();
    tampilkanPesan("Ayo coba pasangan yang lain.");
  }, WAKTU_TAMPIL_SALAH);
}

function bersihkanTimer() {
  window.clearTimeout(timerSalah);
  window.clearTimeout(timerSelesai);
  window.clearTimeout(timerPesan);
  if (gameMessage) gameMessage.classList.remove("visible");
  timerPesan = null;
  timerSalah = null;
  timerSelesai = null;
}

function mulaiPermainan() {
  if (dataKosakata.length < 2) {
    tampilkanPesan("Kosakata belum tersedia. Periksa file kosakata.json.", "error");
    tampilkanHalaman(homeScreen);
    return;
  }

  bersihkanTimer();
  const jumlahPasangan = JUMLAH_PER_LEVEL[levelAktif - 1];
  soalAktif = acakDaftar(dataKosakata).slice(0, Math.min(jumlahPasangan, dataKosakata.length));
  daftarIndonesiaAktif = acakDaftar(soalAktif);
  skor = 0;
  pasanganBenar = new Set();
  pilihanDayak = null;
  pilihanIndonesia = null;
  pasanganSalah = [];
  sedangMemeriksa = false;
  warnaPasangan = buatWarnaPasangan(soalAktif);

  if (levelNumber) levelNumber.textContent = String(levelAktif);
  perbaruiSkor();
  perbaruiProgres();
  gambarPapan();
  tampilkanPesan(`Level ${levelAktif}: cocokkan ${soalAktif.length} pasangan kata!`);
  tampilkanHalaman(gameScreen);
}

function selesaikanPermainan() {
  if (pasanganBenar.size !== soalAktif.length) return;
  if (finalPoints) finalPoints.textContent = String(skor);
  if (finishSummary) {
    finishSummary.textContent = `Level ${levelAktif} selesai! Kamu berhasil mencocokkan ${pasanganBenar.size} dari ${soalAktif.length} pasangan dan memperoleh ${skor} poin.`;
  }
  if (levelAktif < 3) {
    levelTerbuka = Math.max(levelTerbuka, levelAktif + 1);
    if (nextLevelButton) { nextLevelButton.hidden = false; nextLevelButton.textContent = `Lanjut ke Level ${levelAktif + 1} →`; }
  } else if (nextLevelButton) {
    nextLevelButton.hidden = true;
    if (finishSummary) finishSummary.textContent += " Kamu telah menuntaskan semua level DayakBelajar. Hebat!";
  }
  perbaruiStatistikBeranda();
  tampilkanHalaman(finishScreen);
}

function lanjutLevel() {
  if (levelAktif >= 3 || levelAktif >= levelTerbuka) return;
  levelAktif += 1;
  mulaiPermainan();
}

function kembaliKeBeranda() {
  bersihkanTimer();
  pilihanDayak = null;
  pilihanIndonesia = null;
  pasanganSalah = [];
  sedangMemeriksa = false;
  perbaruiStatistikBeranda();
  tampilkanHalaman(homeScreen);
}

function bersihkanDataKosakata(data) {
  if (!Array.isArray(data)) {
    throw new Error("Isi kosakata.json harus berupa daftar kosakata.");
  }

  const hasil = [];
  const pasanganTerpakai = new Set();
  const idTerpakai = new Set();

  data.forEach((item, indeks) => {
    const dayak = String(item?.dayak ?? "").trim();
    const indonesia = String(item?.indonesia ?? "").trim();
    if (!dayak || !indonesia) {
      throw new Error(`Kosakata nomor ${indeks + 1} belum memiliki kata Dayak atau arti Indonesia.`);
    }

    // Buang hanya entri yang benar-benar sama persis agar tidak muncul dua kali.
    const kunciPasangan = `${dayak.toLocaleLowerCase("id-ID")}||${indonesia.toLocaleLowerCase("id-ID")}`;
    if (pasanganTerpakai.has(kunciPasangan)) return;
    pasanganTerpakai.add(kunciPasangan);

    const dasarID = String(item.id || dayak)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `kata-${indeks + 1}`;

    let id = dasarID;
    let nomor = 2;
    while (idTerpakai.has(id)) id = `${dasarID}-${nomor++}`;
    idTerpakai.add(id);
    hasil.push({ id, dayak, indonesia });
  });

  if (hasil.length < 2) {
    throw new Error("Kamus harus memiliki minimal dua pasangan kosakata.");
  }
  return hasil;
}

async function muatKosakata() {
  if (startButton) startButton.disabled = true;
  if (loadMessage) {
    loadMessage.classList.remove("error");
    loadMessage.textContent = "Memuat kosakata...";
  }

  try {
    const response = await fetch(FILE_KOSAKATA, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`File kosakata.json tidak ditemukan (HTTP ${response.status}).`);
    }
    const data = await response.json();
    dataKosakata = bersihkanDataKosakata(data);

    if (loadMessage) {
      loadMessage.textContent = `Kamus berhasil dimuat: ${dataKosakata.length} kosakata.`;
    }
    if (startButton) startButton.disabled = false;
    perbaruiStatistikBeranda();
    console.info(`DayakBelajar siap. ${dataKosakata.length} kosakata dimuat.`);
  } catch (error) {
    console.error("Gagal memuat kosakata:", error);
    if (loadMessage) {
      loadMessage.classList.add("error");
      loadMessage.textContent = `Kosakata gagal dimuat. ${error.message} Jalankan project dengan VS Code Live Server.`;
    }
    if (startButton) startButton.disabled = true;
  }
}

// Hubungkan semua tombol setelah elemen HTML siap (script memakai defer).
startButton?.addEventListener("click", mulaiPermainan);
backButton?.addEventListener("click", kembaliKeBeranda);
resetButton?.addEventListener("click", mulaiPermainan);
replayButton?.addEventListener("click", mulaiPermainan);
nextLevelButton?.addEventListener("click", lanjutLevel);
finishBackButton?.addEventListener("click", kembaliKeBeranda);

// Tampilan awal.
tampilkanHalaman(homeScreen);
perbaruiStatistikBeranda();
muatKosakata();
