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

        // Helper to render text with Telegram-style line breaks
        const val = (key) => (settingsMap[key] ? settingsMap[key].value.replace(/\n/g, '<br>') : `<span style="color:red">[Missing: ${key}]</span>`);

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>Telegram Bot Simulator</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    :root { --tg-bg: #8da6ba; --tg-sent: #effdde; --tg-white: #ffffff; --tg-blue: #3390ec; }
                    body { background: #e6ebee; font-family: -apple-system, system-ui, sans-serif; overflow-x: hidden; }
                    
                    /* Layout */
                    .tg-container { display: flex; gap: 10px; padding: 15px; overflow-x: auto; height: 100vh; align-items: flex-start; }
                    .phone-screen { 
                        min-width: 320px; max-width: 360px; height: 85vh; 
                        background: var(--tg-bg) url("https://www.transparenttextures.com/patterns/cubes.png"); 
                        border-radius: 20px; display: flex; flex-direction: column; 
                        box-shadow: 0 10px 25px rgba(0,0,0,0.2); position: relative; border: 8px solid #222;
                    }
                    .screen-header { background: #517da2; color: white; padding: 12px; font-weight: bold; font-size: 0.9rem; text-align: center; border-radius: 10px 10px 0 0; }
                    .chat-area { flex-grow: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
                    
                    /* Telegram Bubbles */
                    .msg { display: flex; flex-direction: column; max-width: 85%; position: relative; cursor: pointer; }
                    .msg.bot { align-items: flex-start; }
                    .msg.user { align-items: flex-end; align-self: flex-end; }
                    
                    .bubble { 
                        padding: 8px 12px; border-radius: 15px; font-size: 0.9rem; position: relative; 
                        box-shadow: 0 1px 2px rgba(0,0,0,0.1); border: 2px solid transparent; 
                    }
                    .bot .bubble { background: var(--tg-white); border-bottom-left-radius: 2px; }
                    .user .bubble { background: var(--tg-sent); border-bottom-right-radius: 2px; }
                    .msg:hover .bubble { border-color: var(--tg-blue); }

                    /* Edit Overlay */
                    .edit-hint { position: absolute; top: -18px; left: 5px; font-size: 0.65rem; font-weight: bold; color: #fff; background: var(--tg-blue); padding: 1px 6px; border-radius: 4px; opacity: 0; }
                    .msg:hover .edit-hint { opacity: 1; }

                    /* Keyboards */
                    .tg-kbd { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 8px; width: 100%; }
                    .tg-btn { background: rgba(255,255,255,0.8); border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; padding: 5px; text-align: center; font-size: 0.8rem; color: var(--tg-blue); font-weight: 500; }
                    
                    .admin-alert { border-left: 4px solid #f39c12 !important; border-radius: 4px !important; }
                    .error-bubble { border-left: 4px solid #e74c3c !important; }

                    @media (max-width: 768px) { .tg-container { flex-direction: column; align-items: center; } .phone-screen { min-width: 95%; height: 70vh; } }
                </style>
            </head>
            <body>

            <div class="tg-container">
                
                <!-- 1. USER INTERFACE (DM) -->
                <div class="phone-screen">
                    <div class="screen-header">Bot (Private DM)</div>
                    <div class="chat-area">
                        <div class="msg user"><div class="bubble">/start</div></div>
                        <div class="msg bot" onclick="openEditModal('main_menu_title')">
                            <div class="edit-hint">main_menu_title</div>
                            <div class="bubble">${val('main_menu_title')}<div class="tg-kbd"><div class="tg-btn">Deposit</div><div class="tg-btn">Withdraw</div></div></div>
                        </div>

                        <div class="msg bot" onclick="openEditModal('dep_menu_title')">
                            <div class="edit-hint">dep_menu_title</div>
                            <div class="bubble">${val('dep_menu_title')}<div class="tg-kbd"><div class="tg-btn">Screenshot</div><div class="tg-btn">Manual</div></div></div>
                        </div>

                        <div class="msg bot" onclick="openEditModal('manual_entry_start')">
                            <div class="edit-hint">manual_entry_start</div>
                            <div class="bubble">${val('manual_entry_start')}</div>
                        </div>

                        <div class="msg bot" onclick="openEditModal('m_step_1')">
                            <div class="edit-hint">m_step_1</div><div class="bubble">${val('m_step_1')}</div>
                        </div>

                        <div class="msg bot error-bubble" onclick="openEditModal('err_invalid_format')">
                            <div class="edit-hint">err_invalid_format</div><div class="bubble">${val('err_invalid_format')}</div>
                        </div>

                        <div class="msg bot" onclick="openEditModal('verifying_status')">
                            <div class="edit-hint">verifying_status</div><div class="bubble"><i>${val('verifying_status')}</i></div>
                        </div>
                        
                        <div class="msg bot" onclick="openEditModal('user_dep_success')">
                            <div class="edit-hint">user_dep_success</div><div class="bubble">${val('user_dep_success')}</div>
                        </div>
                    </div>
                </div>

                <!-- 2. WITHDRAW & ERRORS -->
                <div class="phone-screen">
                    <div class="screen-header">Workflow & Alerts</div>
                    <div class="chat-area">
                        <div class="msg bot" onclick="openEditModal('withdraw_menu_title')">
                            <div class="edit-hint">withdraw_menu_title</div>
                            <div class="bubble">${val('withdraw_menu_title')}<div class="tg-kbd"><div class="tg-btn">bKash</div><div class="tg-btn">Nagad</div></div></div>
                        </div>
                        
                        <div class="msg bot" onclick="openEditModal('wd_success_msg')">
                            <div class="edit-hint">wd_success_msg</div><div class="bubble">${val('wd_success_msg')}</div>
                        </div>

                        <div class="msg bot error-bubble" onclick="openEditModal('err_not_found')">
                            <div class="edit-hint">err_not_found</div><div class="bubble">${val('err_not_found')}</div>
                        </div>

                        <div class="msg bot error-bubble" onclick="openEditModal('err_scan_fail')">
                            <div class="edit-hint">err_scan_fail</div><div class="bubble">${val('err_scan_fail')}</div>
                        </div>

                        <div class="msg bot" onclick="openEditModal('user_dep_rej')">
                            <div class="edit-hint">user_dep_rej</div><div class="bubble">${val('user_dep_rej')}</div>
                        </div>

                        <div class="msg bot" onclick="openEditModal('user_wd_paid')">
                            <div class="edit-hint">user_wd_paid</div><div class="bubble">${val('user_wd_paid')}</div>
                        </div>
                    </div>
                </div>

                <!-- 3. PUBLIC GROUP & ADMIN -->
                <div class="phone-screen">
                    <div class="screen-header">Group & Admin Panel</div>
                    <div class="chat-area">
                        <div class="msg bot" onclick="openEditModal('group_dep_sub')">
                            <div class="edit-hint">group_dep_sub</div><div class="bubble" style="background:#f1f1f1">${val('group_dep_sub')}<br>ID: PLAYER123</div>
                        </div>

                        <div class="msg bot" onclick="openEditModal('group_dep_done')">
                            <div class="edit-hint">group_dep_done</div><div class="bubble" style="background:#f1f1f1">${val('group_dep_done')}</div>
                        </div>

                        <div class="msg bot" onclick="openEditModal('group_wd_req')">
                            <div class="edit-hint">group_wd_req</div><div class="bubble" style="background:#f1f1f1">${val('group_wd_req')}</div>
                        </div>

                        <div class="msg bot" onclick="openEditModal('admin_wd_req')">
                            <div class="edit-hint">admin_wd_req</div>
                            <div class="bubble admin-alert">
                                <b>Admin Alert:</b><br>${val('admin_wd_req')}
                                <div class="tg-kbd"><div class="tg-btn" style="color:green">✅ DONE</div><div class="tg-btn" style="color:red">❌ REJECT</div></div>
                            </div>
                        </div>

                        <div class="msg bot" onclick="openEditModal('group_wd_fail')">
                            <div class="edit-hint">group_wd_fail</div><div class="bubble" style="background:#f1f1f1">${val('group_wd_fail')}</div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Modal for Editing -->
            <div class="modal fade" id="editModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <form class="modal-content shadow-lg border-0" action="/admin/settings/update" method="POST">
                        <div class="modal-header">
                            <h6 class="modal-title fw-bold" id="keyLabel">Edit Message</h6>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" name="key" id="modalKey">
                            <textarea name="value" id="modalValue" class="form-control" rows="8" style="font-size: 0.9rem; font-family: monospace;"></textarea>
                            <div class="form-text mt-2 small">Use *bold* or _italic_ if your bot supports Markdown.</div>
                        </div>
                        <div class="modal-footer border-0">
                            <button type="submit" class="btn btn-primary w-100 rounded-pill py-2">Update Bot Content</button>
                        </div>
                    </form>
                </div>
            </div>

            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
            <script>
                const settings = ${JSON.stringify(settingsMap)};
                function openEditModal(key) {
                    const data = settings[key];
                    document.getElementById('modalKey').value = key;
                    document.getElementById('keyLabel').innerText = "Database Key: " + key;
                    document.getElementById('modalValue').value = data ? data.value : "";
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