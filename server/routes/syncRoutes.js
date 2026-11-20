import express from 'express';
import { google } from 'googleapis';
import ExcelJS from 'exceljs';
import User from '../models/User.js';
import Batch from '../models/Batch.js';
import FollowUp from '../models/FollowUp.js';
import LookupData from '../models/LookupData.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserOAuthClient } from '../utils/googleDriveUpload.js';
import { buildStyledFollowUpBlueprint, getMonthOnlyName } from '../utils/sheetFormatter.js';

const router = express.Router();

// 1. Manual "Sync to Google Sheet" with Exact Colors, Borders, Merges & Data Validation
router.post('/google-sheet', requireAuth, async (req, res) => {
  try {
    const month = req.body.month || new Date().toISOString().slice(0, 7);

    let targetUser = req.user;
    if (req.user.role === 'admin' && req.body.facultyId) {
      const found = await User.findById(req.body.facultyId);
      if (found) targetUser = found;
    }

    const sheetUrl = (targetUser.googleSheetUrl || '').trim();
    if (!sheetUrl) {
      return res.status(400).json({
        message: `No Google Sheet or Apps Script Web App URL configured for ${targetUser.displayName || targetUser.name}. Please add it in Sheet & WhatsApp Settings first.`,
      });
    }

    const tabTitle = (targetUser.displayName || targetUser.name || 'Faculty').trim();

    const batches = await Batch.find({
      status: 'Ongoing',
      $or: [
        { facultyId: targetUser._id },
        { facultyName: new RegExp(`^${tabTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ],
    }).sort({ scheduleType: 1, batchCode: 1 });

    const followUps = await FollowUp.find({
      month,
      batchId: { $in: batches.map((b) => b._id) },
    })
      .populate('studentId')
      .sort({ createdAt: 1 });

    const { rows, rowStyles, merges } = buildStyledFollowUpBlueprint({
      month,
      batches,
      followUps,
    });

    // Path A: Zero-OAuth Google Apps Script Web App Bridge (Bypasses Workspace API blocks)
    if (sheetUrl.includes('script.google.com')) {
      const response = await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabTitle,
          rows,
          rowStyles,
          merges,
        }),
        redirect: 'follow',
      });

      const resultText = await response.text();
      let parsed;
      try {
        parsed = JSON.parse(resultText);
      } catch {
        throw new Error('Apps Script did not return valid JSON. Verify "Who has access" is set to "Anyone".');
      }

      if (parsed.status === 'error') {
        throw new Error(parsed.message);
      }

      targetUser.lastSyncedAt = new Date();
      await targetUser.save();

      return res.json({
        message: `Synced ${tabTitle} (${getMonthOnlyName(month)}) to Google Sheet via Apps Script.`,
        lastSyncedAt: targetUser.lastSyncedAt,
      });
    }

    // Path B: Direct Google Sheets API (for personal @gmail.com accounts)
    const { oauthClient } = await getUserOAuthClient(req.user._id);
    const sheetsApi = google.sheets({ version: 'v4', auth: oauthClient });
    const spreadsheetId = targetUser.googleSheetId;

    const meta = await sheetsApi.spreadsheets.get({ spreadsheetId });
    const existingTabs = meta.data.sheets || [];
    let matchedTab = existingTabs.find(
      (s) => s.properties?.title?.toLowerCase().trim() === tabTitle.toLowerCase()
    );

    let sheetNumericId;
    if (!matchedTab) {
      const addRes = await sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tabTitle } } }],
        },
      });
      sheetNumericId = addRes.data.replies[0].addSheet.properties.sheetId;
    } else {
      sheetNumericId = matchedTab.properties.sheetId;
    }

    const escapedTab = `'${tabTitle.replace(/'/g, "''")}'`;
    await sheetsApi.spreadsheets.values.clear({
      spreadsheetId,
      range: `${escapedTab}!A1:Q500`,
    });

    await sheetsApi.spreadsheets.values.update({
      spreadsheetId,
      range: `${escapedTab}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    targetUser.lastSyncedAt = new Date();
    await targetUser.save();

    res.json({
      message: `Synced ${tabTitle} (${getMonthOnlyName(month)}) to Google Sheet successfully.`,
      lastSyncedAt: targetUser.lastSyncedAt,
    });
  } catch (err) {
    console.error('Google Sheet Sync Error:', err);
    res.status(500).json({
      message:
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to sync with Google Sheet.',
    });
  }
});

// 2. One-Click ExcelJS .xlsx Export (Exact Colors, Merges, Borders & Embedded Screenshots)
router.get('/export-xlsx', requireAuth, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    let facultyList = [];
    if (req.user.role === 'admin' && !req.query.facultyId) {
      facultyList = await User.find({ isActive: true }).sort({ displayName: 1 });
    } else {
      const targetId =
        req.user.role === 'admin' && req.query.facultyId ? req.query.facultyId : req.user._id;
      const single = await User.findById(targetId);
      if (single) facultyList = [single];
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Student Follow-Up Portal';

    let driveClient = null;
    try {
      const { oauthClient } = await getUserOAuthClient(req.user._id);
      driveClient = google.drive({ version: 'v3', auth: oauthClient });
    } catch {
      driveClient = null;
    }

    const thinBlackBorder = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };

    for (const fac of facultyList) {
      const tabName = (fac.displayName || fac.name || 'Faculty').slice(0, 31);
      const batches = await Batch.find({
        status: 'Ongoing',
        $or: [
          { facultyId: fac._id },
          { facultyName: new RegExp(`^${tabName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        ],
      }).sort({ scheduleType: 1, batchCode: 1 });

      if (batches.length === 0 && facultyList.length > 1) continue;

      const followUps = await FollowUp.find({
        month,
        batchId: { $in: batches.map((b) => b._id) },
      })
        .populate('studentId')
        .sort({ createdAt: 1 });

      const { rows, rowStyles, merges, screenshotMarkers } = buildStyledFollowUpBlueprint({
        month,
        batches,
        followUps,
      });

      const worksheet = workbook.addWorksheet(tabName);

      // Write rows
      rows.forEach((r) => {
        const cleanRow = r.map((cellVal) =>
          typeof cellVal === 'string' && cellVal.startsWith('=IMAGE(') ? '' : cellVal
        );
        worksheet.addRow(cleanRow);
      });

      // Exact column widths matching your template
      const colWidths = [6, 17, 23, 12, 15, 22, 11, 11, 11, 24, 14, 17, 22, 18, 24, 16, 16];
      colWidths.forEach((w, idx) => {
        worksheet.getColumn(idx + 1).width = w;
      });

      // Apply exact cell fills, fonts, alignments, and thin black gridlines
      rowStyles.forEach((st, idx) => {
        const rowNum = idx + 1;
        const excelRow = worksheet.getRow(rowNum);

        if (st.type === 'titleBanner') {
          excelRow.height = 30;
          for (let c = 1; c <= 17; c++) {
            const cell = excelRow.getCell(c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
            cell.font = { name: 'Times New Roman', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = thinBlackBorder;
          }
        } else if (st.type === 'columnHeader') {
          excelRow.height = 34;
          for (let c = 1; c <= 17; c++) {
            const cell = excelRow.getCell(c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF808080' } };
            cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF000000' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = thinBlackBorder;
          }
        } else if (st.type === 'weekBanner') {
          excelRow.height = 28;
          for (let c = 1; c <= 17; c++) {
            const cell = excelRow.getCell(c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF548235' } };
            cell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = thinBlackBorder;
          }
        } else if (st.type === 'dateHeader') {
          excelRow.height = 21;
          for (let c = 1; c <= 17; c++) {
            const cell = excelRow.getCell(c);
            if (c >= 7 && c <= 9) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
              cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
            cell.border = thinBlackBorder;
          }
        } else if (st.type === 'dataRow') {
          excelRow.height = 20;
          for (let c = 1; c <= 17; c++) {
            const cell = excelRow.getCell(c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
            cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
            cell.border = thinBlackBorder;
            // Center-align Batch Code, Timings, Coordinator, and A/P/LV cells
            if (c >= 4 && c <= 9) {
              cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            } else {
              cell.alignment = { vertical: 'middle' };
            }
          }
        }
      });

      // Apply all merged ranges (Title, Absent Info, Week Banners, and Batch Code/Timings/Coordinator blocks)
      merges.forEach((m) => {
        worksheet.mergeCells(m.sRow, m.sCol, m.eRow, m.eCol);
      });

      // Embed uploaded Drive screenshots directly inside Column P (ScreenShot)
      if (driveClient && screenshotMarkers.length > 0) {
        for (const marker of screenshotMarkers) {
          if (!marker.driveFileId) continue;
          try {
            const imgRes = await driveClient.files.get(
              { fileId: marker.driveFileId, alt: 'media' },
              { responseType: 'arraybuffer' }
            );
            const imgBuffer = Buffer.from(imgRes.data);
            const imageId = workbook.addImage({
              buffer: imgBuffer,
              extension: 'png',
            });

            worksheet.getRow(marker.rowIndex).height = 52;
            worksheet.addImage(imageId, {
              tl: { col: 15, row: marker.rowIndex - 1 },
              ext: { width: 110, height: 48 },
            });
          } catch (imgErr) {
            console.warn(`Could not embed screenshot ${marker.driveFileId}:`, imgErr.message);
          }
        }
      }
    }

    // Add 'data' lookup sheet matching reference workbook
    const lookups = await LookupData.findOne({ key: 'GLOBAL_LOOKUPS' });
    const dataSheet = workbook.addWorksheet('data');
    const maxLen = Math.max(
      lookups?.mediums?.length || 0,
      lookups?.facultyPhones?.length || 0,
      lookups?.coordinators?.length || 0
    );
    for (let i = 0; i < maxLen; i++) {
      dataSheet.addRow([
        lookups?.mediums?.[i] || '',
        '',
        lookups?.facultyPhones?.[i] || '',
        '',
        lookups?.coordinators?.[i] || '',
      ]);
    }
    dataSheet.getColumn(1).width = 24;
    dataSheet.getColumn(3).width = 32;
    dataSheet.getColumn(5).width = 26;

    const fileName = `FollowUp_Sheet_${month}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('ExcelJS Export Error:', err);
    res.status(500).json({ message: 'Failed to generate Excel workbook.' });
  }
});

// 3. Month-End Wipe-Out Button
router.delete('/wipe-month', requireAuth, async (req, res) => {
  try {
    const month = req.query.month;
    if (!month) {
      return res.status(400).json({ message: 'Month parameter (YYYY-MM) is required.' });
    }

    const filter = { month };
    if (req.user.role !== 'admin') {
      const myBatches = await Batch.find({
        $or: [
          { facultyId: req.user._id },
          { facultyName: new RegExp(`^${(req.user.displayName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        ],
      }).select('_id');
      filter.batchId = { $in: myBatches.map((b) => b._id) };
    }

    const result = await FollowUp.deleteMany(filter);
    res.json({
      message: `Wiped ${result.deletedCount} follow-up record(s) for ${getMonthOnlyName(month)}. Ready for new month entries!`,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to wipe month data.' });
  }
});

export default router;