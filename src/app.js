const express = require('express');
const db = require('./db'); // 👈 import DB connection

const app = express();

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
        const result = await db.query("SELECT * FROM bot_settings ORDER BY category, label");
        
        // Group data by category for the modal or reference
        const settingsMap = {};
        result.rows.forEach(row => { settingsMap[row.key] = row; });

        // Helper to get a value or placeholder
        const val = (key) => (settingsMap[key] ? settingsMap[key].value.replace(/\n/g, '<br>') : `[Missing ${key}]`);
        const label = (key) => (settingsMap[key] ? settingsMap[key].label : key);

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Bot Preview Dashboard</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { background-color: #e7ebf0; font-family: -apple-system, system-ui, sans-serif; padding-top: 60px; }
                    
                    /* Common Chat UI */
                    .preview-column { height: 90vh; overflow-y: auto; padding: 20px; border-right: 1px solid #d1d9e0; }
                    .chat-header { font-weight: bold; padding: 10px; background: #fff; border-radius: 10px 10px 0 0; border-bottom: 1px solid #eee; text-align: center; font-size: 0.9rem; }
                    .chat-bg { background: #8da6ba url("https://www.transparenttextures.com/patterns/cubes.png"); border-radius: 0 0 10px 10px; padding: 15px; min-height: 400px; }
                    
                    /* Message Bubbles */
                    .msg { margin-bottom: 15px; display: flex; flex-direction: column; max-width: 85%; }
                    .msg.bot { align-items: flex-start; }
                    .msg.user { align-items: flex-end; margin-left: auto; }
                    
                    .bubble { 
                        padding: 8px 12px; border-radius: 12px; position: relative; font-size: 0.9rem; 
                        box-shadow: 0 1px 2px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;
                    }
                    .bubble:hover { transform: scale(1.02); border: 2px solid #3390ec; }
                    .bot .bubble { background: white; border-radius: 12px 12px 12px 2px; }
                    .user .bubble { background: #effdde; border-radius: 12px 12px 2px 12px; }
                    
                    .btn-group-dummy { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
                    .dummy-btn { 
                        background: rgba(255,255,255,0.8); border: 1px solid #3390ec; color: #3390ec;
                        border-radius: 5px; padding: 3px 10px; font-size: 0.75rem; pointer-events: none;
                    }

                    .admin-notify { background: #fff !important; border-left: 4px solid #3390ec !important; border-radius: 4px !important; }
                    .edit-tag { font-size: 0.7rem; color: #3390ec; font-weight: bold; display: block; margin-bottom: 2px; }
                </style>
            </head>
            <body>
                <nav class="navbar fixed-top navbar-dark bg-primary shadow-sm">
                    <div class="container-fluid">
                        <span class="navbar-brand">Visual Bot Configurator (Click any bubble to Edit)</span>
                    </div>
                </nav>

                <div class="container-fluid">
                    <div class="row">
                        
                        <!-- COLUMN 1: USER DIRECT MESSAGE -->
                        <div class="col-md-4 preview-column">
                            <div class="chat-header">User DM (Private Chat)</div>
                            <div class="chat-bg">
                                <div class="msg user"><div class="bubble">/start</div></div>
                                <div class="msg bot" onclick="openEditModal('main_menu_title')">
                                    <div class="bubble">
                                        <span class="edit-tag">main_menu_title</span>
                                        ${val('main_menu_title')}
                                        <div class="btn-group-dummy">
                                            <div class="dummy-btn">💰 Deposit</div>
                                            <div class="dummy-btn">💸 Withdraw</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="msg user"><div class="bubble">Click: Deposit</div></div>
                                <div class="msg bot" onclick="openEditModal('dep_menu_title')">
                                    <div class="bubble">
                                        <span class="edit-tag">dep_menu_title</span>
                                        ${val('dep_menu_title')}
                                        <div class="btn-group-dummy">
                                            <div class="dummy-btn">📸 Screenshot</div>
                                            <div class="dummy-btn">⌨️ Manual</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- COLUMN 2: PUBLIC GROUP/CHANNEL -->
                        <div class="col-md-4 preview-column">
                            <div class="chat-header">Public Updates (Group/Channel)</div>
                            <div class="chat-bg" style="background-color: #517da2;">
                                <div class="msg bot" onclick="openEditModal('group_dep_done')">
                                    <div class="bubble">
                                        <span class="edit-tag">group_dep_done</span>
                                        ${val('group_dep_done')}<br>
                                        🆔 ID: PLAYER123<br>
                                        💰 Status: Completed Successfully!
                                    </div>
                                </div>

                                <div class="msg bot" onclick="openEditModal('group_wd_done')">
                                    <div class="bubble">
                                        <span class="edit-tag">group_wd_done</span>
                                        ${val('group_wd_done')}<br>
                                        🆔 ID: PLAYER123<br>
                                        💰 Amount: 500 BDT
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- COLUMN 3: ADMIN NOTIFICATIONS -->
                        <div class="col-md-4 preview-column">
                            <div class="chat-header">Admin Control Panel (Bot -> Admin)</div>
                            <div class="chat-bg" style="background: #212121;">
                                <div class="msg bot" onclick="openEditModal('admin_wd_req')">
                                    <div class="bubble admin-notify">
                                        <span class="edit-tag">admin_wd_req</span>
                                        ${val('admin_wd_req')}<br>
                                        👤 User: 8433649028<br>
                                        💰 Amt: 500
                                        <div class="btn-group-dummy">
                                            <div class="dummy-btn" style="background:#d4edda">✅ DONE</div>
                                            <div class="dummy-btn" style="background:#f8d7da">❌ REJECT</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Reusable Edit Modal -->
                <div class="modal fade" id="editModal" tabindex="-1">
                  <div class="modal-dialog modal-dialog-centered">
                    <form class="modal-content" action="/admin/settings/update" method="POST">
                      <div class="modal-header">
                        <h5 class="modal-title" id="modalTitle">Edit Configuration</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div class="modal-body">
                        <input type="hidden" name="key" id="modalKey">
                        <div class="mb-3">
                            <label id="modalLabelText" class="form-label fw-bold text-primary"></label>
                            <textarea name="value" id="modalValue" class="form-control" rows="6" required></textarea>
                            <div class="form-text mt-2">HTML/Markdown is supported depending on your bot logic.</div>
                        </div>
                      </div>
                      <div class="modal-footer">
                        <button type="submit" class="btn btn-primary w-100">Apply Changes</button>
                      </div>
                    </form>
                  </div>
                </div>

                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
                <script>
                    const settingsData = ${JSON.stringify(settingsMap)};

                    function openEditModal(key) {
                        const item = settingsData[key];
                        if(!item) return;

                        document.getElementById('modalKey').value = key;
                        document.getElementById('modalTitle').innerText = 'Editing: ' + key;
                        document.getElementById('modalLabelText').innerText = item.label;
                        document.getElementById('modalValue').value = item.value;
                        
                        new bootstrap.Modal(document.getElementById('editModal')).show();
                    }
                </script>
            </body>
            </html>
        `);
    } catch (err) { res.status(500).send(err.message); }
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

// POST: Save Updates
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