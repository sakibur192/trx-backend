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

        // Helper to get value or fallback
        const val = (key) => (settingsMap[key] ? settingsMap[key].value.replace(/\n/g, '<br>') : `<span class="text-danger">[Missing ${key}]</span>`);

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Visual Bot Manager</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    :root { --tg-blue: #3390ec; --tg-bg: #8da6ba; --tg-admin: #212121; }
                    body { background-color: #f4f7f9; font-family: -apple-system, system-ui, sans-serif; }
                    .navbar { background: #517da2 !important; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                    
                    /* Viewport Columns */
                    .preview-col { height: calc(100vh - 60px); overflow-y: auto; padding: 20px; border-right: 1px solid #ddd; }
                    .col-title { font-weight: bold; font-size: 0.8rem; color: #555; text-transform: uppercase; margin-bottom: 15px; text-align: center; letter-spacing: 1px; }
                    
                    /* Chat Styles */
                    .chat-window { background: var(--tg-bg) url("https://www.transparenttextures.com/patterns/cubes.png"); border-radius: 12px; padding: 15px; min-height: 500px; margin-bottom: 30px; }
                    .msg { margin-bottom: 12px; display: flex; flex-direction: column; align-items: flex-start; }
                    .bubble { 
                        background: white; padding: 8px 12px; border-radius: 12px 12px 12px 2px; 
                        font-size: 0.9rem; max-width: 90%; cursor: pointer; transition: 0.2s;
                        border: 2px solid transparent; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .bubble:hover { border-color: var(--tg-blue); transform: translateY(-2px); }
                    .key-tag { font-size: 0.65rem; color: var(--tg-blue); font-weight: bold; display: block; border-bottom: 1px solid #eee; margin-bottom: 4px; }
                    
                    /* Admin/Status specific */
                    .admin-bg { background: var(--tg-admin); }
                    .admin-bubble { border-left: 4px solid var(--tg-blue); border-radius: 4px !important; }
                    .btn-preview { border: 1px solid var(--tg-blue); color: var(--tg-blue); font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; margin-top: 5px; display: inline-block; margin-right: 4px; }
                    
                    /* Scrollbar */
                    ::-webkit-scrollbar { width: 5px; }
                    ::-webkit-scrollbar-thumb { background: #bbb; border-radius: 10px; }
                </style>
            </head>
            <body>
                <nav class="navbar navbar-dark sticky-top">
                    <div class="container-fluid">
                        <span class="navbar-brand mb-0 h1">🤖 Bot Interface Manager</span>
                        <div class="d-flex text-white small">Click any bubble to edit text</div>
                    </div>
                </nav>

                <div class="container-fluid">
                    <div class="row">
                        
                        <!-- COLUMN 1: USER FLOW (THE BOT'S FACE) -->
                        <div class="col-md-4 preview-col">
                            <div class="col-title">User Interaction Flow</div>
                            <div class="chat-window">
                                <!-- Menu Section -->
                                <div class="msg" onclick="openEditModal('main_menu_title')">
                                    <div class="bubble"><span class="key-tag">main_menu_title</span> ${val('main_menu_title')} <div class="btn-preview">Deposit</div><div class="btn-preview">Withdraw</div></div>
                                </div>
                                <div class="msg" onclick="openEditModal('dep_menu_title')">
                                    <div class="bubble"><span class="key-tag">dep_menu_title</span> ${val('dep_menu_title')} <div class="btn-preview">Screenshot</div><div class="btn-preview">Manual</div></div>
                                </div>
                                <div class="msg" onclick="openEditModal('manual_entry_start')">
                                    <div class="bubble"><span class="key-tag">manual_entry_start</span> ${val('manual_entry_start')}</div>
                                </div>
                                
                                <!-- Process Section -->
                                <div class="msg" onclick="openEditModal('m_step_1')"><div class="bubble"><span class="key-tag">m_step_1</span> ${val('m_step_1')}</div></div>
                                <div class="msg" onclick="openEditModal('m_step_2')"><div class="bubble"><span class="key-tag">m_step_2</span> ${val('m_step_2')}</div></div>
                                <div class="msg" onclick="openEditModal('m_step_3')"><div class="bubble"><span class="key-tag">m_step_3</span> ${val('m_step_3')}</div></div>
                                
                                <!-- Scanning Section -->
                                <div class="msg" onclick="openEditModal('ocr_status')"><div class="bubble"><span class="key-tag">ocr_status</span> ${val('ocr_status')}</div></div>
                                <div class="msg" onclick="openEditModal('ocr_success')"><div class="bubble"><span class="key-tag">ocr_success</span> ${val('ocr_success')}</div></div>
                                <div class="msg" onclick="openEditModal('verifying_status')"><div class="bubble"><span class="key-tag">verifying_status</span> ${val('verifying_status')}</div></div>
                                
                                <!-- Final User Alerts -->
                                <div class="msg" onclick="openEditModal('user_dep_success')"><div class="bubble"><span class="key-tag">user_dep_success</span> ${val('user_dep_success')}</div></div>
                                <div class="msg" onclick="openEditModal('user_dep_rej')"><div class="bubble"><span class="key-tag">user_dep_rej</span> ${val('user_dep_rej')}</div></div>
                                <div class="msg" onclick="openEditModal('user_wd_paid')"><div class="bubble"><span class="key-tag">user_wd_paid</span> ${val('user_wd_paid')}</div></div>
                                <div class="msg" onclick="openEditModal('user_wd_rej')"><div class="bubble"><span class="key-tag">user_wd_rej</span> ${val('user_wd_rej')}</div></div>
                            </div>
                        </div>

                        <!-- COLUMN 2: ERROR & SYSTEM ALERTS -->
                        <div class="col-md-4 preview-col">
                            <div class="col-title">Error & System Alerts</div>
                            <div class="chat-window" style="background-color: #728fa3;">
                                <div class="msg" onclick="openEditModal('err_duplicate')"><div class="bubble"><span class="key-tag">err_duplicate</span> ${val('err_duplicate')}</div></div>
                                <div class="msg" onclick="openEditModal('err_not_found')"><div class="bubble"><span class="key-tag">err_not_found</span> ${val('err_not_found')}</div></div>
                                <div class="msg" onclick="openEditModal('err_scan_fail')"><div class="bubble"><span class="key-tag">err_scan_fail</span> ${val('err_scan_fail')}</div></div>
                                <div class="msg" onclick="openEditModal('err_invalid_format')"><div class="bubble"><span class="key-tag">err_invalid_format</span> ${val('err_invalid_format')}</div></div>
                                <div class="msg" onclick="openEditModal('err_ocr_gen')"><div class="bubble"><span class="key-tag">err_ocr_gen</span> ${val('err_ocr_gen')}</div></div>
                                
                                <div class="msg mt-4" onclick="openEditModal('withdraw_menu_title')">
                                    <div class="bubble"><span class="key-tag">withdraw_menu_title</span> ${val('withdraw_menu_title')} <div class="btn-preview">bKash</div><div class="btn-preview">Nagad</div></div>
                                </div>
                                <div class="msg" onclick="openEditModal('wd_success_msg')"><div class="bubble"><span class="key-tag">wd_success_msg</span> ${val('wd_success_msg')}</div></div>
                            </div>
                        </div>

                        <!-- COLUMN 3: GROUP & ADMIN PREVIEW -->
                        <div class="col-md-4 preview-col">
                            <div class="col-title">Group & Admin Notifications</div>
                            <div class="chat-window admin-bg">
                                <!-- Group Updates -->
                                <div class="msg" onclick="openEditModal('group_dep_sub')"><div class="bubble"><span class="key-tag">group_dep_sub</span> ${val('group_dep_sub')}</div></div>
                                <div class="msg" onclick="openEditModal('group_wd_req')"><div class="bubble"><span class="key-tag">group_wd_req</span> ${val('group_wd_req')}</div></div>
                                <div class="msg" onclick="openEditModal('group_dep_done')"><div class="bubble"><span class="key-tag">group_dep_done</span> ${val('group_dep_done')}</div></div>
                                <div class="msg" onclick="openEditModal('group_wd_done')"><div class="bubble"><span class="key-tag">group_wd_done</span> ${val('group_wd_done')}</div></div>
                                <div class="msg" onclick="openEditModal('group_wd_fail')"><div class="bubble"><span class="key-tag">group_wd_fail</span> ${val('group_wd_fail')}</div></div>

                                <!-- Admin Requests -->
                                <div class="msg mt-4" onclick="openEditModal('admin_dep_req')">
                                    <div class="bubble admin-bubble"><span class="key-tag">admin_dep_req</span> ${val('admin_dep_req')}<br><small class="text-muted">Approval buttons appear here</small></div>
                                </div>
                                <div class="msg" onclick="openEditModal('admin_wd_req')">
                                    <div class="bubble admin-bubble"><span class="key-tag">admin_wd_req</span> ${val('admin_wd_req')}<br><small class="text-muted">Payment buttons appear here</small></div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Modal -->
                <div class="modal fade" id="editModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <form class="modal-content" action="/admin/settings/update" method="POST">
                            <div class="modal-header border-0">
                                <h6 class="modal-title fw-bold" id="titleText">Edit Message</h6>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <input type="hidden" name="key" id="inputKey">
                                <label class="form-label small fw-bold text-muted" id="labelName"></label>
                                <textarea name="value" id="inputValue" class="form-control" rows="6" style="font-family: monospace; font-size: 0.9rem;"></textarea>
                            </div>
                            <div class="modal-footer border-0">
                                <button type="submit" class="btn btn-primary w-100 rounded-pill">Update Database</button>
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
                        document.getElementById('titleText').innerText = "Key: " + key;
                        document.getElementById('labelName').innerText = item ? item.label : "Edit Value";
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