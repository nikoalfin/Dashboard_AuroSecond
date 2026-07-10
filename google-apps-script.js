// =========================================================================
// GOOGLE APPS SCRIPT - AUROSECOND SPREADSHEET DATABASE
// =========================================================================
// Salin dan tempel kode ini ke editor Apps Script Anda (Ekstensi -> Apps Script)
// Kode ini dilengkapi dengan auto-formatting desain premium untuk spreadsheet Anda.

// Ambil data dari Sheets saat website pertama kali dibuka (READ)
function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  var data = [];
  
  // Jika hanya ada header atau spreadsheet masih kosong total
  if (rows.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([]))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Ambil data mulai dari baris kedua (index 1) setelah header
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0]) continue; // Lewati jika ID baris kosong
    
    data.push({
      id: Number(row[0]),
      nama: String(row[1] || ""),
      status: String(row[2] || "Ready"),
      tglBeli: row[3] ? Admin.formatDate(row[3]) : "",
      tglLaku: row[4] ? Admin.formatDate(row[4]) : "",
      modalNiko: Number(row[5]) || 0,
      modalFikri: Number(row[6]) || 0,
      penjualan: Number(row[7]) || 0,
      totalPengeluaran: Number(row[8]) || 0,
      pengeluaran: row[9] ? JSON.parse(row[9]) : [],
      gambar: String(row[10] || "")
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(data))
                       .setMimeType(ContentService.MimeType.JSON);
}

// Simpan atau Update data dari website (CREATE / UPDATE / DELETE)
function doPost(e) {
  var output = ContentService.createTextOutput();
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var item = JSON.parse(e.postData.contents);
    
    // Log info debugging ke tab "Logs" di Spreadsheet
    logToSheet("POST request received. Keys: " + Object.keys(item).join(", "));
    if (item.gambarBase64) {
      logToSheet("gambarBase64 length: " + item.gambarBase64.length + ", nama: " + item.gambarNama);
    } else {
      logToSheet("gambarBase64 is null/empty. item.gambar: " + item.gambar);
    }
    
    var rows = sheet.getDataRange().getValues();
    var foundIndex = -1;
    
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == item.id) {
        foundIndex = i + 1;
        break;
      }
    }
    
    // Handler untuk aksi DELETE
    if (item.action === 'delete') {
      if (foundIndex !== -1) {
        sheet.deleteRow(foundIndex);
        // Format ulang spreadsheet setelah baris dihapus
        formatSpreadsheet(sheet);
        output.setContent(JSON.stringify({"status": "success", "message": "Unit berhasil dihapus"}));
      } else {
        output.setContent(JSON.stringify({"status": "error", "message": "ID tidak ditemukan"}));
      }
      output.setMimeType(ContentService.MimeType.JSON);
      return output;
    }
    
    // Fungsi pembantu untuk mencegah nilai NaN (#NUM! di Sheets)
    var cleanNum = function(val) {
      var num = Number(val);
      return isNaN(num) ? 0 : num;
    };
    
    // Handler untuk upload gambar ke Google Drive
    var gambarUrl = item.gambar || "";
    if (item.gambarBase64 && item.gambarNama) {
      try {
        var folder;
        var folders = DriveApp.getFoldersByName("Aurosecond_Images");
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder("Aurosecond_Images");
        }
        
        var contentType = item.gambarBase64.substring(5, item.gambarBase64.indexOf(";"));
        var bytes = Utilities.base64Decode(item.gambarBase64.split(",")[1]);
        var blob = Utilities.newBlob(bytes, contentType, item.gambarNama);
        var file = folder.createFile(blob);
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareError) {
          console.warn("Gagal mengatur sharing: " + shareError.toString());
        }
        
        // Buat direct link agar gambar bisa langsung ditampilkan di HTML (workaround 2024+)
        gambarUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
        logToSheet("Gambar sukses diupload ke Drive: " + gambarUrl);
      } catch (uploadError) {
        logToSheet("Gagal mengupload gambar ke Drive: " + uploadError.toString());
      }
    }
    
    var rowData = [
      item.id,
      item.nama,
      item.status,
      item.tglBeli || "",
      item.tglLaku || "",
      cleanNum(item.modalNiko),
      cleanNum(item.modalFikri),
      cleanNum(item.penjualan),
      cleanNum(item.totalPengeluaran),
      JSON.stringify(item.pengeluaran || []),
      gambarUrl
    ];
    
    if (foundIndex !== -1) {
      sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
      logToSheet("Berhasil update baris " + foundIndex + " untuk ID " + item.id);
    } else {
      sheet.appendRow(rowData);
      logToSheet("Berhasil tambah baris baru untuk ID " + item.id);
    }
    
    // Terapkan desain kustom premium secara otomatis setelah data masuk/update
    formatSpreadsheet(sheet);
    
    output.setContent(JSON.stringify({"status": "success"}));
    output.setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    logToSheet("CRITICAL ERROR di doPost: " + error.toString());
    output.setContent(JSON.stringify({"status": "error", "message": error.toString()}));
    output.setMimeType(ContentService.MimeType.JSON);
  }
  return output;
}

// Menghias Spreadsheet secara otomatis agar tampil profesional dan premium
function formatSpreadsheet(sheet) {
  // Pastikan garis kisi (gridlines) aktif
  sheet.setHiddenGridlines(false);
  
  var lastRow = sheet.getLastRow();
  var totalColumns = 11; // Kolom A sampai K (ditambah Gambar)
  
  // Pastikan teks header kolom K tertulis "Gambar"
  var gambarHeader = sheet.getRange(1, 11);
  if (gambarHeader.getValue() !== "Gambar") {
    gambarHeader.setValue("Gambar");
  }

  // 1. FORMAT HEADER (Baris 1)
  var headerRange = sheet.getRange(1, 1, 1, totalColumns);
  headerRange.setFontFamily("Arial")
             .setFontSize(11)
             .setFontWeight("bold")
             .setFontColor("#FFFFFF")
             .setBackground("#0F172A") // Dark Slate (Sleek dan Premium)
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
             
  sheet.setRowHeight(1, 38); // Header lebih tinggi agar lega
  sheet.setFrozenRows(1);    // Kunci baris header agar tidak ikut tergulir
  
  // Border tebal untuk memisahkan header
  headerRange.setBorder(true, true, true, true, true, true, "#1E293B", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // 2. FORMAT DATA (Baris 2 ke bawah)
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, totalColumns);
    
    // Set tinggi baris data dan font dasar
    for (var r = 2; r <= lastRow; r++) {
      sheet.setRowHeight(r, 28);
    }
    dataRange.setFontFamily("Arial")
             .setFontSize(10)
             .setVerticalAlignment("middle");
             
    // Alternating Background (Zebra striping dengan warna slate super lembut)
    var backgrounds = [];
    for (var r = 2; r <= lastRow; r++) {
      var rowBg = (r % 2 === 0) ? "#FFFFFF" : "#F8FAFC"; // Putih & Abu-abu Slate tipis
      backgrounds.push([rowBg, rowBg, rowBg, rowBg, rowBg, rowBg, rowBg, rowBg, rowBg, rowBg, rowBg]);
    }
    dataRange.setBackgrounds(backgrounds);
    
    // Border tipis abu-abu untuk pembatas sel yang rapi
    dataRange.setBorder(true, true, true, true, true, true, "#E2E8F0", SpreadsheetApp.BorderStyle.SOLID);
    
    // Format Alignment & Warna per Kolom
    // Kolom A: ID Motor (Center, bold, abu gelap)
    sheet.getRange(2, 1, lastRow - 1, 1)
         .setHorizontalAlignment("center")
         .setFontWeight("bold")
         .setFontColor("#475569");
         
    // Kolom B: Nama Motor (Left, bold, hitam gelap)
    sheet.getRange(2, 2, lastRow - 1, 1)
         .setHorizontalAlignment("left")
         .setFontWeight("bold")
         .setFontColor("#0F172A");
         
    // Kolom C: Status (Center)
    sheet.getRange(2, 3, lastRow - 1, 1)
         .setHorizontalAlignment("center");
         
    // Kolom D & E: Tanggal Beli & Laku (Center, abu gelap)
    sheet.getRange(2, 4, lastRow - 1, 2)
         .setHorizontalAlignment("center")
         .setFontColor("#475569");
         
    // Kolom F, G, H, I: Modal & Penjualan Rupiah (Right, format Rupiah)
    sheet.getRange(2, 6, lastRow - 1, 4)
         .setHorizontalAlignment("right")
         .setNumberFormat('Rp#,##0')
         .setFontColor("#0F172A");
         
    // Kolom J: JSON Detail Pengeluaran (Clip text agar tidak overflow berantakan, warna abu pudar)
    sheet.getRange(2, 10, lastRow - 1, 1)
         .setHorizontalAlignment("left")
         .setFontColor("#94A3B8")
         .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
         
    // Kolom K: Gambar URL (Center, font pudar, clip text)
    sheet.getRange(2, 11, lastRow - 1, 1)
         .setHorizontalAlignment("center")
         .setFontColor("#94A3B8")
         .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
         
    // 3. ATUR CONDITIONAL FORMATTING UNTUK STATUS (KOLOM C)
    sheet.clearConditionalFormatRules();
    
    // Aturan untuk status "Ready" (Teks Biru di Background Biru Muda)
    var ruleReady = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("Ready")
        .setBackground("#DBEAFE")
        .setFontColor("#1D4ED8")
        .setBold(true)
        .setRanges([sheet.getRange(2, 3, lastRow - 1, 1)])
        .build();
        
    // Aturan untuk status "Terjual" (Teks Hijau di Background Hijau Muda)
    var ruleTerjual = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("Terjual")
        .setBackground("#D1FAE5")
        .setFontColor("#047857")
        .setBold(true)
        .setRanges([sheet.getRange(2, 3, lastRow - 1, 1)])
        .build();
        
    sheet.setConditionalFormatRules([ruleReady, ruleTerjual]);
  }
  
  // 4. ATUR LEBAR KOLOM SECARA SPESIFIK AGAR PRESISI
  sheet.setColumnWidth(1, 65);   // ID Motor
  sheet.setColumnWidth(2, 180);  // Nama Motor
  sheet.setColumnWidth(3, 90);   // Status
  sheet.setColumnWidth(4, 100);  // Tgl Beli
  sheet.setColumnWidth(5, 100);  // Tgl Laku
  sheet.setColumnWidth(6, 120);  // Modal Niko
  sheet.setColumnWidth(7, 120);  // Modal Fikri
  sheet.setColumnWidth(8, 120);  // Penjualan
  sheet.setColumnWidth(9, 130);  // Total Pengeluaran
  sheet.setColumnWidth(10, 150); // Detail JSON
  sheet.setColumnWidth(11, 130); // Gambar URL
}

var Admin = {
  formatDate: function(dateVal) {
    if (!dateVal) return "";
    try {
      var d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      var month = '' + (d.getMonth() + 1),
          day = '' + d.getDate(),
          year = d.getFullYear();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      return [year, month, day].join('-');
    } catch(e) {
      return String(dateVal);
    }
  }
};

// Fungsi pembantu untuk memicu otorisasi Google Drive & langsung memformat spreadsheet secara manual
function runFormat() {
  // Pemicu otorisasi Google Drive (diakses langsung agar terdeteksi oleh sistem otorisasi Google)
  var rootFolder = DriveApp.getRootFolder();
  Logger.log("Berhasil memicu otorisasi Drive. Folder utama: " + rootFolder.getName());

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  formatSpreadsheet(sheet);
}

// Fungsi pembantu untuk logging langsung ke tab "Logs" di Spreadsheet Anda
function logToSheet(message) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName("Logs");
    if (!logSheet) {
      logSheet = ss.insertSheet("Logs");
      logSheet.appendRow(["Timestamp", "Log Message"]);
      logSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#F1F5F9");
      logSheet.setColumnWidth(1, 160);
      logSheet.setColumnWidth(2, 600);
    }
    logSheet.appendRow([new Date(), message]);
  } catch (e) {
    // Abaikan jika penulisan log gagal agar tidak merusak program utama
  }
}
