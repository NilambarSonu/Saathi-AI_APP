import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SoilTest } from './soil';
import { User } from '../services/auth';

export async function exportSoilReport(tests: SoilTest[], user: User) {
  const html = generateReportHTML(tests, user);
  const { uri } = await Print.printToFileAsync({ 
    html, 
    base64: false
  });
  
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share Soil Report',
    UTI: 'com.adobe.pdf',
  });
}

function generateReportHTML(tests: SoilTest[], user: User): string {
  const rows = tests.map(test => `
    <tr>
      <td>${new Date(test.createdAt).toLocaleDateString()}</td>
      <td class="${test.ph >= 6 && test.ph <= 7.5 ? 'good' : 'warn'}">${parseFloat(test.ph.toString()).toFixed(1)}</td>
      <td>${test.n}</td>
      <td>${test.p}</td>
      <td>${test.k}</td>
      <td>${test.moisture}%</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html><html>
    <head><style>
      body { font-family: Arial, sans-serif; margin: 40px; }
      .header { background: #1A7B3C; color: white; padding: 20px; border-radius: 8px; }
      .stat { display: inline-block; margin: 10px; padding: 10px 20px; border: 1px solid #C8E6D0; border-radius: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th { background: #E8F7ED; padding: 10px; text-align: left; font-size: 13px; color: #1A7B3C; }
      td { padding: 12px 10px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #333; }
      .good { color: #1A7B3C; font-weight: bold; }
      .warn { color: #F4A02D; font-weight: bold; }
      .bad  { color: #E53935; font-weight: bold; }
      .footer { margin-top: 50px; text-align: center; color: #888; font-size: 11px; }
    </style></head>
    <body>
      <div class="header">
        <h1>🌱 Saathi AI Soil Report</h1>
        <p>${user.name} · Generated ${new Date().toLocaleDateString('en-IN')}</p>
      </div>
      
      <h3 style="margin-top: 30px; color: #1A7B3C;">Historical Test Results</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>pH Level</th>
            <th>N (ppm)</th>
            <th>P (ppm)</th>
            <th>K (ppm)</th>
            <th>Moisture</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : "<tr><td colspan='6' style='text-align: center;'>No historical data available.</td></tr>"}
        </tbody>
      </table>
      
      <div class="footer">
        Mitti-AI Innovations &middot; saathiai.org &middot; &copy; 2026
      </div>
    </body></html>
  `;
}
