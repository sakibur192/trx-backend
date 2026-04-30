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
        const settingsMap = {};
        result.rows.forEach(row => { settingsMap[row.key] = row; });

        const val = (key) => (settingsMap[key] ? settingsMap[key].value.replace(/\n/g, '<br>') : `<span style="color:red">[Missing: ${key}]</span>`);

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Telegram Bot Management</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    :root {
                        --tg-bg: #547594;
                        --tg-sent: #effdde;
                        --tg-received: #ffffff;
                        --tg-date: rgba(74, 99, 120, 0.5);
                        --tg-button: #3390ec;
                    }
                    body { background-color: #e6ebee; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto; margin: 0; }
                    
                    /* Sidebar Simulation */
                    .tg-layout { display: flex; height: 100vh; overflow: hidden; }
                    .tg-sidebar { width: 300px; background: white; border-right: 1px solid #dfe5e9; overflow-y: auto; }
                    .tg-chat-area { flex-grow: 1; display: flex; flex-direction: column; background: #8da6ba url("https://www.transparenttextures.com/patterns/cubes.png"); position: relative; }
                    
                    /* Chat List */
                    .chat-item { padding: 12px 15px; border-bottom: 1px solid #f2f2f2; cursor: pointer; display: flex; align-items: center; gap: 12px; }
                    .chat-item:hover { background: #f4f4f5; }
                    .chat-item.active { background: var(--tg-button); color: white; }
                    .avatar { width: 45px; height: 45px; border-radius: 50%; background: #40a7e3; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; }

                    /* Message Bubbles */
                    .messages-container { flex-grow: 1; overflow-y: auto; padding: 20px 10%; display: flex; flex-direction: column; }
                    .msg-row { display: flex; flex-direction: column; margin-bottom: 8px; width: 100%; position: relative; }
                    .msg-row.received { align-items: flex-start; }
                    .msg-row.sent { align-items: flex-end; }
                    
                    .bubble {
                        max-width: 85%;
                        padding: 6px 12px 8px 12px;
                        border-radius: 12px;
                        position: relative;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                        cursor: pointer;
                        border: 2px solid transparent;
                        transition: all 0.2s;
                    }
                    .bubble:hover { border-color: var(--tg-button); filter: brightness(0.98); }
                    .received .bubble { background: var(--tg-received); border-bottom-left-radius: 2px; }
                    .sent .bubble { background: var(--tg-sent); border-bottom-right-radius: 2px; }
                    
                    .edit-btn { 
                        position: absolute; top: -10px; right: -10px; background: var(--tg-button); 
                        color: white; border-radius: 50%; width: 22px; height: 22px; 
                        display: flex; align-items: center; justify-content: center; font-size: 12px;
                        opacity: 0; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    }
                    .bubble:hover .edit-btn { opacity: 1; }

                    /* Text Styles */
                    .msg-text { font-size: 0.95rem; line-height: 1.4; color: #000; word-break: break-word; }
                    .key-hint { font-size: 0.65rem; color: #3390ec; font-weight: bold; display: block; margin-bottom: 2px; text-transform: uppercase; }
                    .time { font-size: 0.7rem; color: #a0acb6; float: right; margin-top: 4px; margin-left: 8px; }

                    /* Telegram Buttons */
                    .inline-kbd { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 8px; max-width: 100%; }
                    .ik-btn { background: rgba(255,255,255,0.7); border: 1px solid rgba(0,0,0,0.05); border-radius: 4px; padding: 4px; text-align: center; font-size: 0.85rem; color: #3390ec; font-weight: 500; }

                    /* Scrollbar */
                    ::-webkit-scrollbar { width: 6px; }
                    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 10px; }
                </style>
            </head>
            <body>

            <div class="tg-layout">
                <!-- Sidebar -->
                <div class="tg-sidebar">
                    <div class="p-3 bg-light border-bottom fw-bold text-muted">Telegram Admin</div>
                    <div class="chat-item active">
                        <div class="avatar">Bot</div>
                        <div>
                            <div class="fw-bold small">User Interface</div>
                            <div class="small text-muted">Main & Deposit Flow</div>
                        </div>
                    </div>
                    <div class="chat-item">
                        <div class="avatar" style="background:#51bc9d">Grp</div>
                        <div>
                            <div class="fw-bold small">Public Group</div>
                            <div class="small text-muted">Transaction Logs</div>
                        </div>
                    </div>
                    <div class="chat-item">
                        <div class="avatar" style="background:#e57e78">Adm</div>
                        <div>
                            <div class="fw-bold small">Admin Alerts</div>
                            <div class="small text-muted">Pending Tasks</div>
                        </div>
                    </div>
                </div>

                <!-- Chat Canvas -->
                <div class="tg-chat-area">
                    <div class="messages-container">
                        
                        <!-- 1. START FLOW -->
                        <div class="msg-row sent"><div class="bubble"><div class="msg-text">/start</div><div class="time">12:00</div></div></div>
                        
                        <div class="msg-row received" onclick="openEditModal('main_menu_title')">
                            <div class="bubble">
                                <div class="edit-btn">✎</div>
                                <span class="key-hint">main_menu_title</span>
                                <div class="msg-text">${val('main_menu_title')}</div>
                                <div class="inline-kbd">
                                    <div class="ik-btn">💰 Deposit</div><div class="ik-btn">💸 Withdraw</div>
                                </div>
                                <div class="time">12:00</div>
                            </div>
                        </div>

                        <!-- 2. DEPOSIT FLOW -->
                        <div class="msg-row sent"><div class="bubble"><div class="msg-text">Deposit</div><div class="time">12:01</div></div></div>

                        <div class="msg-row received" onclick="openEditModal('dep_menu_title')">
                            <div class="bubble">
                                <div class="edit-btn">✎</div>
                                <span class="key-hint">dep_menu_title</span>
                                <div class="msg-text">${val('dep_menu_title')}</div>
                                <div class="inline-kbd">
                                    <div class="ik-btn">Manual</div><div class="ik-btn">Screenshot</div>
                                </div>
                                <div class="time">12:01</div>
                            </div>
                        </div>

                        <!-- 3. MANUAL STEPS -->
                        <div class="msg-row received" onclick="openEditModal('manual_entry_start')">
                            <div class="bubble">
                                <div class="edit-btn">✎</div>
                                <span class="key-hint">manual_entry_start</span>
                                <div class="msg-text">${val('manual_entry_start')}</div>
                                <div class="time">12:01</div>
                            </div>
                        </div>

                        <div class="msg-row received" onclick="openEditModal('m_step_1')">
                            <div class="bubble">
                                <div class="edit-btn">✎</div>
                                <span class="key-hint">m_step_1</span>
                                <div class="msg-text">${val('m_step_1')}</div>
                                <div class="time">12:02</div>
                            </div>
                        </div>

                        <!-- 4. ERRORS -->
                        <div class="msg-row sent"><div class="bubble"><div class="msg-text">TRX_WRONG_ID</div><div class="time">12:03</div></div></div>
                        <div class="msg-row received" onclick="openEditModal('err_not_found')">
                            <div class="bubble">
                                <div class="edit-btn">✎</div>
                                <span class="key-hint">err_not_found</span>
                                <div class="msg-text">${val('err_not_found')}</div>
                                <div class="time">12:03</div>
                            </div>
                        </div>

                        <!-- 5. VERIFICATION -->
                        <div class="msg-row received" onclick="openEditModal('verifying_status')">
                            <div class="bubble">
                                <div class="edit-btn">✎</div>
                                <span class="key-hint">verifying_status</span>
                                <div class="msg-text">${val('verifying_status')}</div>
                                <div class="time">12:04</div>
                            </div>
                        </div>

                        <!-- 6. FINAL SUCCESS -->
                        <div class="msg-row received" onclick="openEditModal('user_dep_success')">
                            <div class="bubble">
                                <div class="edit-btn">✎</div>
                                <span class="key-hint">user_dep_success</span>
                                <div class="msg-text">${val('user_dep_success')}</div>
                                <div class="time">12:05</div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- Modal -->
            <div class="modal fade" id="editModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <form class="modal-content shadow-lg border-0" action="/admin/settings/update" method="POST">
                        <div class="modal-header border-0 bg-light">
                            <h6 class="modal-title fw-bold" id="titleText">Edit Telegram Message</h6>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" name="key" id="inputKey">
                            <textarea name="value" id="inputValue" class="form-control" rows="8" style="font-size:0.95rem; background:#fdfdfd"></textarea>
                        </div>
                        <div class="modal-footer border-0">
                            <button type="submit" class="btn btn-primary w-100 rounded-pill py-2">Save Message</button>
                        </div>
                    </form>
                </div>
            </div>

            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
            <script>
                const data = ${JSON.stringify(settingsMap)};
                function openEditModal(key) {
                    const item = data[key];
                    document.getElementById('inputKey').value = key;
                    document.getElementById('titleText').innerText = "Database Key: " + key;
                    document.getElementById('inputValue').value = item ? item.value : "";
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