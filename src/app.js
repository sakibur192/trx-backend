const express = require('express');
const db = require('./db'); // 👈 import DB connection

const fs = require("fs");
const path = require("path");
const app = express();
const multer = require("multer");


const storage = multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

app.use('/uploads', express.static('uploads'));
// =======================
// Middleware
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// =======================
// DB HEALTH CHECK (IMPORTANT)
// =======================
const checkDB = async () => {
  try {
    await db.query('SELECT 1');
    console.log('🟢 Database Connected Successfully');
  } catch (err) {
    console.error('🔴 Database Connection Failed:', err.message);
  }
};

// run DB check on startup
checkDB();

// =======================
// ROUTES
// =======================

// DB routes
const dbRoutes = require('./routes/dbRoutes');
app.use('/db', dbRoutes);

// optional api routes (if you keep it later)
const routes = require('./routes');
app.use('/api', routes);





 require('./bot');












app.get('/admin/settings', async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM bot_settings ORDER BY category, label"
        );

        const categories = {};
        // ======================
        // GROUPING SAFE (UNCHANGED LOGIC)
        // ======================
        result.rows.forEach(row => {
            if (!categories[row.category]) categories[row.category] = [];
            categories[row.category].push(row);
        });

        let sectionsHtml = '';

        for (const cat in categories) {

            // category header (unchanged UI)
            sectionsHtml += `
                <div class="chat-date">
                    <span>${cat.toUpperCase()} MESSAGES</span>
                </div>
            `;

            sectionsHtml += categories[cat].map(s => `
                <div class="message-container">
                    <div class="message-bubble shadow-sm">

                        <div class="msg-label">${s.label}</div>

                        <div class="msg-content" id="content-${s.key}">
                            ${String(s.value).replace(/\n/g, '<br>')}
                        </div>

                        <div class="msg-footer">
                            <button class="btn-edit" onclick="openEditModal('${s.key}', '${s.label}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit
                            </button>
                        </div>

                    </div>
                </div>
            `).join('');
        }

        res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Telegram Bot Admin</title>

            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

            <style>
                body { 
                    background-color: #8da6ba;
                    background-image: url("https://www.transparenttextures.com/patterns/cubes.png");
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
                }

                .chat-container { max-width: 600px; margin: auto; padding: 20px 15px; }

                .chat-date { text-align: center; margin: 20px 0; }
                .chat-date span {
                    background: rgba(0,0,0,0.3);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 15px;
                    font-size: 0.75rem;
                    font-weight: bold;
                }

                .message-container { display: flex; flex-direction: column; margin-bottom: 12px; }

                .message-bubble {
                    background: white;
                    border-radius: 12px 12px 12px 2px;
                    padding: 8px 12px;
                    max-width: 85%;
                }

                .msg-label {
                    color: #3390ec;
                    font-weight: bold;
                    font-size: 0.85rem;
                    margin-bottom: 3px;
                }

                .msg-content {
                    color: #000;
                    font-size: 0.95rem;
                    white-space: pre-wrap;
                    word-break: break-word;
                }

                .msg-footer {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 5px;
                    border-top: 1px solid #eee;
                    padding-top: 5px;
                }

                .btn-edit {
                    background: none;
                    border: none;
                    color: #3390ec;
                    font-size: 0.8rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    cursor: pointer;
                }

                .modal-content { border-radius: 15px; border: none; }
                textarea.form-control { border-radius: 10px; }
            </style>
        </head>

        <body>


    <nav style="
    position: sticky;
    top: 0;
    z-index: 1000;
    background: #517da2;
    padding: 12px;
    border-radius: 0 0 14px 14px;
">

    <!-- TITLE -->
    <div style="
        text-align: center;
        color: white;
        font-weight: 700;
        font-size: 18px;
        margin-bottom: 10px;
    ">
        🤖 Bot Config
    </div>

    <!-- BUTTONS -->
<div style="
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 420px;
    margin: 10px auto;
    padding: 0 10px;
">

    <a href="/admin/images" style="
        display: block;
        text-decoration: none;
        background: #28a745;
        color: white;
        padding: 14px;
        text-align: center;
        border-radius: 12px;
        font-weight: 600;
        border: 1px solid #000;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    ">
        🖼 Manage Images
    </a>

    <a href="/depositreq" style="
        display: block;
        text-decoration: none;
        background: #ffc107;
        color: #000;
        padding: 14px;
        text-align: center;
        border-radius: 12px;
        font-weight: 600;
        border: 1px solid #000;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    ">
        💰 Deposit Requests
    </a>

    <a href="/withdrawreq" style="
        display: block;
        text-decoration: none;
        background: #dc3545;
        color: white;
        padding: 14px;
        text-align: center;
        border-radius: 12px;
        font-weight: 600;
        border: 1px solid #000;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    ">
        💸 Withdraw Requests
    </a>

</div>

</nav>

        <div class="chat-container">
            ${sectionsHtml}
        </div>

        <!-- MODAL -->
        <div class="modal fade" id="editModal">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">

              <div class="modal-header">
                <h5 class="modal-title" id="modalLabel">Edit Message</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>

              <form action="/admin/settings/update" method="POST">
                <div class="modal-body">
                    <input type="hidden" name="key" id="modalKey">

                    <textarea name="value" id="modalValue" class="form-control" rows="6"></textarea>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                    <button class="btn btn-primary">Save</button>
                </div>
              </form>

            </div>
          </div>
        </div>





        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

        <script>
            function openEditModal(key, label) {
                document.getElementById('modalKey').value = key;
                document.getElementById('modalLabel').innerText = 'Edit: ' + label;

                const content = document.getElementById('content-' + key).innerText;
                document.getElementById('modalValue').value = content;

                new bootstrap.Modal(document.getElementById('editModal')).show();
            }
        </script>

        </body>
        </html>
        `);

    } catch (err) {
        res.status(500).send(err.message);
    }
});

function htmlPage(title, content) {
    return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>

<style>
body {
    font-family: system-ui;
    background: #eef2f7;
    margin: 0;
}

.header {
    background: #4a6cf7;
    color: #fff;
    padding: 14px;
    text-align: center;
    font-weight: bold;
}

.container {
    padding: 10px;
}

.card {
    background: #fff;
    padding: 12px;
    border-radius: 12px;
    margin-bottom: 10px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.row {
    font-size: 14px;
    margin: 3px 0;
}

.pending { color: orange; }
.success { color: green; }
.rejected { color: red; }

.btns {
    display: flex;
    gap: 6px;
    margin-top: 8px;
}

button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 8px;
    font-weight: bold;
}

.ok {
    background: #28a745;
    color: white;
}

.bad {
    background: #dc3545;
    color: white;
}
</style>
</head>

<body>

<div class="header">${title}</div>

<div class="container">
${content}
</div>

</body>
</html>
`;
}

app.get('/depositreq', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM deposit_history
            ORDER BY id DESC
        `);

        const rows = result.rows.map(r => `
            <div class="card">
                <div class="row">
                    <b>🆔 Player:</b> ${r.player_id}
                </div>
                <div class="row">
                    <b>💰 Amount:</b> ${r.amount}
                </div>
                <div class="row">
                    <b>🔑 TRX:</b> ${r.trx_id}
                </div>
                <div class="row">
                    <b>📱 Sender:</b> ${r.sender_number || '-'}
                </div>
                <div class="row">
                    <b>📊 Status:</b> <span class="${r.status}">${r.status}</span>
                </div>

    
            </div>
        `).join('');

        res.send(htmlPage("💰 Deposit Requests", rows));

    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/depositreq/approve', async (req, res) => {
    const { trx_id } = req.body;

    await db.query(
        "UPDATE deposit_history SET status = 'success' WHERE trx_id = $1",
        [trx_id]
    );

    res.redirect('/depositreq');
});

app.post('/depositreq/reject', async (req, res) => {
    const { trx_id } = req.body;

    await db.query(
        "UPDATE deposit_history SET status = 'rejected' WHERE trx_id = $1",
        [trx_id]
    );

    res.redirect('/depositreq');
});

app.get('/withdrawreq', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM withdraw_history
            ORDER BY id DESC
        `);

        const rows = result.rows.map(r => `
            <div class="card">
                <div class="row"><b>🆔 Player:</b> ${r.player_id}</div>
                <div class="row"><b>💰 Amount:</b> ${r.amount}</div>
                <div class="row"><b>🏦 Method:</b> ${r.method}</div>
                <div class="row"><b>📱 Number:</b> ${r.wallet_number}</div>
                <div class="row">
                    <b>📊 Status:</b> <span class="${r.status}">${r.status}</span>
                </div>

              
            </div>
        `).join('');

        res.send(htmlPage("💸 Withdraw Requests", rows));

    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/withdrawreq/approve', async (req, res) => {
    const { user_id, player_id } = req.body;

    await db.query(
        "UPDATE withdraw_history SET status = 'success' WHERE user_id = $1 AND player_id = $2 AND status = 'pending'",
        [user_id, player_id]
    );

    res.redirect('/withdrawreq');
});

app.post('/withdrawreq/reject', async (req, res) => {
    const { user_id, player_id } = req.body;

    await db.query(
        "UPDATE withdraw_history SET status = 'rejected' WHERE user_id = $1 AND player_id = $2 AND status = 'pending'",
        [user_id, player_id]
    );

    res.redirect('/withdrawreq');
});


app.get('/admin/images', async (req, res) => {
    try {

        const uploadDir = path.resolve(process.cwd(), "uploads");

        // safety check (prevents crash)
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const files = fs.readdirSync(uploadDir)
            .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
            .sort((a, b) => b.localeCompare(a));

        let html = files.map((file) => `
            <div class="img-card">

                <div class="img-header">
                    📁 ${file}
                </div>

                <img src="/uploads/${file}" class="img-preview" />

                <form method="POST" action="/admin/images/delete">
                    <input type="hidden" name="file" value="${file}" />
                    <button class="delete-btn">🗑 Delete</button>
                </form>

            </div>
        `).join('');

        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Image Manager</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

    <style>
        body {
            background: #eef2f7;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
        }

        .container { max-width: 520px; }

        .upload-card {
            background: #fff;
            padding: 15px;
            border-radius: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }

        .img-card {
            background: #fff;
            border-radius: 15px;
            margin-bottom: 15px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }

        .img-header {
            padding: 10px;
            font-size: 13px;
            background: #f5f7fb;
        }

        .img-preview {
            width: 100%;
            display: block;
        }

        .delete-btn {
            width: 100%;
            border: none;
            padding: 10px;
            background: #ff4d4f;
            color: white;
            font-weight: 600;
        }
    </style>
</head>

<body>

<div class="container mt-3">

    <div class="upload-card">
        <form action="/admin/images/upload" method="POST" enctype="multipart/form-data">

            <input type="text" name="key" class="form-control" placeholder="Setting Key" required />
            <input type="file" name="images" class="form-control mt-2" multiple required />

            <button class="btn btn-primary w-100 mt-2">📤 Upload</button>

        </form>
    </div>

    ${html}

</div>

</body>
</html>
        `);

    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});


const BASE_URL = "http://187.127.145.228:4001";
app.post('/admin/images/upload', upload.array('images', 10), async (req, res) => {
    try {
        const { key } = req.body;

        if (!req.files?.length) {
            return res.status(400).send("No images uploaded");
        }

        for (const file of req.files) {

            // FIX: full URL instead of local path
            const imageUrl = `${BASE_URL}/uploads/${file.filename}`;

            await db.query(`
                INSERT INTO bot_setting_images (setting_key, image_url)
                VALUES ($1, $2)
            `, [key, imageUrl]);
        }

        res.redirect('/admin/images');

    } catch (err) {
        res.status(500).send(err.message);
    }
});

function getStatusClass(status) {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'failed';
  return 'processing';
}
app.get('/transactions', async (req, res) => {
  try {
    const { trx_id } = req.query;

    let result;

    // 🔍 SEARCH MODE
    if (trx_id) {
      result = await db.query(
        `SELECT * FROM transactions
         WHERE trx_id ILIKE $1
         ORDER BY id DESC`,
        [`%${trx_id}%`]
      );
    } else {
      // 📋 ALL DATA
      result = await db.query(
        `SELECT * FROM transactions ORDER BY id DESC`
      );
    }

    const rows = result.rows;

    // table rows
    const tableRows = rows.map(row => `
      <tr>
        <td>${row.id}</td>
        <td>${row.trx_id}</td>
        <td>${row.amount}</td>
        <td>${row.sender}</td>
        <td>${row.user_id || '-'}</td>
        <td>${row.player_id || '-'}</td>
        <td>${row.source || '-'}</td>
        <td>
          <span class="badge ${getStatusClass(row.status)}">
            ${row.status}
          </span>
        </td>
        <td>${new Date(row.created_at).toLocaleString()}</td>
      </tr>
    `).join('');

    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Transactions</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

  <style>
    body {
      background: #f4f6f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
    }

    .container {
      max-width: 1100px;
    }

    .card {
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    }

    table {
      font-size: 14px;
    }

    .badge {
      padding: 5px 8px;
      border-radius: 8px;
      font-size: 12px;
    }

    .processing { background: orange; color: white; }
    .success { background: green; color: white; }
    .failed { background: red; color: white; }
  </style>
</head>

<body>

<div class="container mt-4">

  <h4 class="mb-3">💰 Transaction History</h4>

  <!-- 🔍 SEARCH -->
  <div class="card p-3 mb-3">
    <form method="GET" action="/transactions">
      <div class="input-group">
        <input type="text"
               name="trx_id"
               class="form-control"
               placeholder="Search by Transaction ID"
               value="${trx_id || ''}" />
        <button class="btn btn-primary">Search</button>
        <a href="/transactions" class="btn btn-secondary">Reset</a>
      </div>
    </form>
  </div>

  <!-- 📋 TABLE -->
  <div class="card p-3">

    <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle">

        <thead class="table-light">
          <tr>
            <th>ID</th>
            <th>TRX ID</th>
            <th>Amount</th>
            <th>Sender</th>
            <th>User</th>
            <th>Player</th>
            <th>Source</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>

        <tbody>
          ${tableRows || `<tr><td colspan="9" class="text-center">No data found</td></tr>`}
        </tbody>

      </table>
    </div>

  </div>

</div>

</body>
</html>
    `);

  } catch (err) {
    res.status(500).send(err.message);
  }
});


// 🎯 helper function


app.post('/admin/images/delete', async (req, res) => {
    try {
        const { file } = req.body;

        if (!file) {
            return res.status(400).send("File not provided");
        }

        // prevent path injection
        const fileName = path.basename(file);

        const filePath = path.resolve(process.cwd(), "uploads", fileName);

        // delete file if exists
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Deleted:", filePath);
        } else {
            console.log("File not found:", filePath);
        }

        return res.redirect('/admin/images');

    } catch (err) {
        console.error("DELETE ERROR:", err);
        res.status(500).send("Delete failed");
    }
});



// app.get('/admin/settings', async (req, res) => {
//     try {
//         const result = await db.query("SELECT * FROM bot_settings ORDER BY category, label");
        
//         const categories = {};
//         result.rows.forEach(row => {
//             if (!categories[row.category]) categories[row.category] = [];
//             categories[row.category].push(row);
//         });

//         let sectionsHtml = '';
//         for (const cat in categories) {
//             sectionsHtml += `<div class="chat-date"><span>${cat.toUpperCase()} MESSAGES</span></div>`;
//             sectionsHtml += categories[cat].map(s => `
//                 <div class="message-container">
//                     <div class="message-bubble shadow-sm">
//                         <div class="msg-label">${s.label}</div>
//                         <div class="msg-content" id="content-${s.key}">${s.value.replace(/\n/g, '<br>')}</div>
//                         <div class="msg-footer">
//                             <button class="btn-edit" onclick="openEditModal('${s.key}', '${s.label}')">
//                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
//                                 Edit
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             `).join('');
//         }

//         res.send(`
//             <!DOCTYPE html>
//             <html lang="en">
//             <head>
//                 <meta charset="UTF-8">
//                 <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
//                 <title>Telegram Bot Admin</title>
//                 <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
//                 <style>
//                     body { 
//                         background-color: #8da6ba; /* Telegram Classic Background */
//                         background-image: url("https://www.transparenttextures.com/patterns/cubes.png");
//                         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
//                     }
//                     .chat-container { max-width: 600px; margin: auto; padding: 20px 15px; }
                    
//                     /* Date/Category Separator */
//                     .chat-date { text-align: center; margin: 20px 0; }
//                     .chat-date span { 
//                         background: rgba(0,0,0,0.3); color: white; 
//                         padding: 4px 12px; border-radius: 15px; font-size: 0.75rem; font-weight: bold; 
//                     }

//                     /* Message Bubbles */
//                     .message-container { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 12px; }
//                     .message-bubble { 
//                         background: white; border-radius: 12px 12px 12px 2px; 
//                         padding: 8px 12px; max-width: 85%; position: relative; 
//                     }
//                     .msg-label { color: #3390ec; font-weight: bold; font-size: 0.85rem; margin-bottom: 3px; }
//                     .msg-content { color: #000; font-size: 0.95rem; white-space: pre-wrap; word-break: break-word; }
//                     .msg-footer { display: flex; justify-content: flex-end; margin-top: 5px; border-top: 1px solid #eee; padding-top: 5px; }
                    
//                     .btn-edit { 
//                         background: none; border: none; color: #3390ec; 
//                         font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 4px; cursor: pointer;
//                     }

//                     /* Modal Styling */
//                     .modal-content { border-radius: 15px; border: none; }
//                     .modal-header { border-bottom: none; padding-bottom: 0; }
//                     .modal-footer { border-top: none; }
//                     textarea.form-control { border-radius: 10px; border: 1px solid #ddd; font-size: 0.95rem; }
//                 </style>
//             </head>
//             <body>
//                 <nav class="navbar sticky-top navbar-dark" style="background: #517da2;">
//                     <div class="container-fluid justify-content-center">
//                         <span class="navbar-brand mb-0 h1">🤖 Bot Config</span>
//                     </div>
//                 </nav>

//                 <div class="chat-container">
//                     ${sectionsHtml}
//                 </div>

//                 <!-- Edit Modal -->
//                 <div class="modal fade" id="editModal" tabindex="-1" aria-hidden="true">
//                   <div class="modal-dialog modal-dialog-centered">
//                     <div class="modal-content">
//                       <div class="modal-header">
//                         <h5 class="modal-title" id="modalLabel" style="color: #3390ec;">Edit Message</h5>
//                         <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
//                       </div>
//                       <form action="/admin/settings/update" method="POST">
//                         <div class="modal-body">
//                             <input type="hidden" name="key" id="modalKey">
//                             <div class="mb-3">
//                                 <label class="small text-muted mb-2">Original value will be overwritten</label>
//                                 <textarea name="value" id="modalValue" class="form-control" rows="5" required></textarea>
//                             </div>
//                         </div>
//                         <div class="modal-footer">
//                             <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
//                             <button type="submit" class="btn btn-primary rounded-pill px-4" style="background: #3390ec;">Save Changes</button>
//                         </div>
//                       </form>
//                     </div>
//                   </div>
//                 </div>

//                 <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
//                 <script>
//                     function openEditModal(key, label) {
//                         const content = document.getElementById('content-' + key).innerText;
//                         document.getElementById('modalKey').value = key;
//                         document.getElementById('modalLabel').innerText = 'Edit: ' + label;
//                         document.getElementById('modalValue').value = content;
                        
//                         var myModal = new bootstrap.Modal(document.getElementById('editModal'));
//                         myModal.show();
//                     }
//                 </script>
//             </body>
//             </html>
//         `);
//     } catch (err) { res.status(500).send(err.message); }
// });



app.post('/admin/settings/update', async (req, res) => {
    const { key, value } = req.body;
    try {
        await db.query("UPDATE bot_settings SET value = $1 WHERE key = $2", [value, key]);
        res.redirect('/admin/settings');
    } catch (err) { res.status(500).send("Update Failed"); }
});




// =======================
// TEST ROUTE
// =======================
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TRX Backend Server Running'
  });
});

// =======================
// 404 HANDLER (IMPORTANT)
// =======================
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

module.exports = app;