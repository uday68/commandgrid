import { pool } from '../Config/database.js';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';

export const generateChatReport = async (req, res) => {
  const { startDate, endDate, format } = req.body;
  const userId = req.user.userId;

  try {
    // Fetch chat messages for the specified date range
    const messagesQuery = `
      SELECT 
        m.message_id,
        m.message,
        m.created_at,
        u.name as sender_name,
        r.room_name,
        p.project_name
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id
      JOIN rooms r ON m.room_id = r.room_id
      LEFT JOIN projects p ON r.project_id = p.project_id
      WHERE m.created_at BETWEEN $1 AND $2
      AND (m.sender_id = $3 OR EXISTS (
        SELECT 1 FROM room_members rm 
        WHERE rm.room_id = m.room_id 
        AND rm.user_id = $3
      ))
      ORDER BY m.created_at ASC
    `;

    const messagesResult = await pool.query(messagesQuery, [startDate, endDate, userId]);

    if (format === 'pdf') {
      // Generate PDF report
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=chat-report.pdf');
      doc.pipe(res);

      // Add title
      doc.fontSize(20).text('Chat Report', { align: 'center' });
      doc.moveDown();

      // Add date range
      doc.fontSize(12).text(`Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`);
      doc.moveDown();

      // Add messages
      messagesResult.rows.forEach(message => {
        doc.fontSize(10)
          .text(`[${new Date(message.created_at).toLocaleString()}] ${message.sender_name} in ${message.room_name}${message.project_name ? ` (${message.project_name})` : ''}:`)
          .text(message.message)
          .moveDown();
      });

      doc.end();
    } else if (format === 'csv') {
      // Generate CSV report
      const fields = ['created_at', 'sender_name', 'room_name', 'project_name', 'message'];
      const parser = new Parser({ fields });
      const csv = parser.parse(messagesResult.rows);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=chat-report.csv');
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Invalid format specified' });
    }
  } catch (error) {
    console.error('Error generating chat report:', error);
    res.status(500).json({ error: 'Failed to generate chat report' });
  }
}; 