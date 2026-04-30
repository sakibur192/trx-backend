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

        const val = (key) => (settingsMap[key] ? settingsMap[key].value.replace(/\n/g, '<br>') : `<span style="color:red; font-weight:bold;">[MISSING: ${key}]</span>`);

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>
                    :root { 
                        --tg-bg: #8da6ba; 
                        --tg-sent: #effdde; 
                        --tg-received: #ffffff; 
                        --tg-blue: #3390ec; 
                        --tg-header: #517da2;
                        --tg-text: #000000;
                        --tg-meta: #a0acb6;
                    }
                    body { background: #e6ebee; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; }
                    
                    /* Telegram App Shell */
                    .tg-main { max-width: 450px; margin: 0 auto; height: 100vh; display: flex; flex-direction: column; background: var(--tg-bg) url("https://www.transparenttextures.com/patterns/cubes.png"); position: relative; box-shadow: 0 0 20px rgba(0,0,0,0.2); }
                    
                    /* Header */
                    .tg-header { background: var(--tg-header); color: white; padding: 10px 15px; display: flex; align-items: center; gap: 15px; flex-shrink: 0; }
                    .tg-header-info { line-height: 1.2; }
                    .tg-header-name { font-weight: bold; font-size: 16px; display: block; }
                    .tg-header-status { font-size: 12px; opacity: 0.8; }

                    /* Message Area */
                    .tg-content { flex-grow: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 6px; }
                    .date-divider { align-self: center; background: rgba(74, 99, 120, 0.4); color: white; padding: 2px 12px; border-radius: 12px; font-size: 11px; margin: 15px 0; font-weight: 500; }

                    /* Message Bubbles */
                    .msg-row { display: flex; flex-direction: column; width: 100%; position: relative; }
                    .received { align-items: flex-start; }
                    .sent { align-items: flex-end; }
                    
                    .bubble { 
                        max-width: 85%; padding: 6px 10px 6px 12px; border-radius: 12px; position: relative; 
                        box-shadow: 0 1px 1px rgba(0,0,0,0.1); cursor: pointer; border: 2px solid transparent; 
                        transition: all 0.1s; line-height: 1.4; font-size: 14.5px;
                    }
                    .received .bubble { background: var(--tg-received); border-bottom-left-radius: 4px; color: var(--tg-text); }
                    .sent .bubble { background: var(--tg-sent); border-bottom-right-radius: 4px; color: var(--tg-text); }
                    
                    /* Hover Edit Effect */
                    .bubble:hover { border-color: var(--tg-blue); filter: brightness(0.98); }
                    .edit-icon { position: absolute; right: -25px; top: 50%; transform: translateY(-50%); color: var(--tg-blue); opacity: 0; font-size: 14px; }
                    .bubble:hover .edit-icon { opacity: 1; }

                    /* System Tags */
                    .key-hint { display: block; font-size: 10px; color: var(--tg-blue); font-weight: bold; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .group-label { font-size: 11px; color: #fff; background: rgba(0,0,0,0.2); padding: 1px 6px; border-radius: 4px; margin-bottom: 2px; align-self: flex-start; }

                    /* Metadata */
                    .time { font-size: 10px; color: var(--tg-meta); float: right; margin: 6px 0 0 8px; }
                    .sent .time { color: #5fb35a; }

                    /* Inline Keyboards */
                    .inline-kbd { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 4px; margin-top: 8px; }
                    .kbd-btn { background: rgba(255,255,255,0.7); border: 1px solid rgba(0,0,0,0.05); border-radius: 6px; padding: 6px; text-align: center; font-size: 13px; color: var(--tg-blue); font-weight: 500; }

                    /* Scrollbar */
                    .tg-content::-webkit-scrollbar { width: 4px; }
                    .tg-content::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                </style>
            </head>
            <body>

            <div class="tg-main">
                <div class="tg-header">
                    <div style="font-size: 20px;">☰</div>
                    <div class="tg-header-info">
                        <span class="tg-header-name">Bot Live Editor</span>
                        <span class="tg-header-status">Editing 29 message keys</span>
                    </div>
                </div>

                <div class="tg-content">
                    <div class="date-divider">MAIN INTERFACE</div>

                    <!-- 1. START & MAIN MENU -->
                    <div class="msg-row sent"><div class="bubble">/start<span class="time">10:00</span></div></div>
                    
                    <div class="msg-row received" onclick="openEditModal('main_menu_title')">
                        <div class="bubble">
                            <span class="key-hint">main_menu_title</span>
                            ${val('main_menu_title')}
                            <div class="inline-kbd"><div class="kbd-btn">💰 Deposit</div><div class="kbd-btn">💸 Withdraw</div></div>
                            <span class="time">10:00</span><span class="edit-icon">✎</span>
                        </div>
                    </div>

                    <div class="date-divider">DEPOSIT PROCESS</div>

                    <!-- 2. DEPOSIT MENU -->
                    <div class="msg-row sent"><div class="bubble">Deposit<span class="time">10:01</span></div></div>
                    <div class="msg-row received" onclick="openEditModal('dep_menu_title')">
                        <div class="bubble">
                            <span class="key-hint">dep_menu_title</span>
                            ${val('dep_menu_title')}
                            <div class="inline-kbd"><div class="kbd-btn">📸 Screenshot</div><div class="kbd-btn">⌨️ Manual</div></div>
                            <span class="time">10:01</span><span class="edit-icon">✎</span>
                        </div>
                    </div>

                    <!-- 3. MANUAL ENTRY (TITLE + STEP 1) -->
                    <div class="msg-row sent"><div class="bubble">Manual Entry<span class="time">10:02</span></div></div>
                    <div class="msg-row received" onclick="openEditModal('manual_entry_start')">
                        <div class="bubble">
                            <span class="key-hint">manual_entry_start + m_step_1</span>
                            ${val('manual_entry_start')}<br>${val('m_step_1')}
                            <span class="time">10:02</span><span class="edit-icon">✎</span>
                        </div>
                    </div>

                    <!-- 4. MANUAL STEPS 2 & 3 -->
                    <div class="msg-row sent"><div class="bubble">TRX8822991<span class="time">10:02</span></div></div>
                    <div class="msg-row received" onclick="openEditModal('m_step_2')">
                        <div class="bubble"><span class="key-hint">m_step_2</span>${val('m_step_2')}<span class="time">10:02</span><span class="edit-icon">✎</span></div>
                    </div>

                    <div class="msg-row sent"><div class="bubble">1000<span class="time">10:03</span></div></div>
                    <div class="msg-row received" onclick="openEditModal('m_step_3')">
                        <div class="bubble"><span class="key-hint">m_step_3</span>${val('m_step_3')}<span class="time">10:03</span><span class="edit-icon">✎</span></div>
                    </div>

                    <!-- 5. SCREENSHOT FLOW -->
                    <div class="msg-row sent"><div class="bubble">Screenshot<span class="time">10:04</span></div></div>
                    <div class="msg-row received" onclick="openEditModal('ss_start')">
                        <div class="bubble"><span class="key-hint">ss_start</span>${val('ss_start')}<span class="time">10:04</span><span class="edit-icon">✎</span></div>
                    </div>

                    <div class="msg-row received" onclick="openEditModal('verifying_status')">
                        <div class="bubble"><span class="key-hint">verifying_status</span><i>${val('verifying_status')}</i><span class="time">10:05</span><span class="edit-icon">✎</span></div>
                    </div>

                    <div class="date-divider">WITHDRAWAL PROCESS</div>

                    <!-- 6. WITHDRAW MENU -->
                    <div class="msg-row sent"><div class="bubble">Withdraw<span class="time">10:06</span></div></div>
                    <div class="msg-row received" onclick="openEditModal('withdraw_menu_title')">
                        <div class="bubble">
                            <span class="key-hint">withdraw_menu_title</span>
                            ${val('withdraw_menu_title')}
                            <div class="inline-kbd">
                                <div class="kbd-btn">bKash</div><div class="kbd-btn">Nagad</div>
                                <div class="kbd-btn">Rocket</div><div class="kbd-btn">Upay</div>
                            </div>
                            <span class="time">10:06</span><span class="edit-icon">✎</span>
                        </div>
                    </div>

                    <div class="msg-row received" onclick="openEditModal('wd_success_msg')">
                        <div class="bubble"><span class="key-hint">wd_success_msg</span>${val('wd_success_msg')}<span class="time">10:07</span><span class="edit-icon">✎</span></div>
                    </div>

                    <div class="date-divider">ERROR STATES</div>

                    <div class="msg-row received" onclick="openEditModal('err_invalid_format')">
                        <div class="bubble" style="border-left: 3px solid #e74c3c;"><span class="key-hint">err_invalid_format</span>${val('err_invalid_format')}<span class="time">10:08</span></div>
                    </div>

                    <div class="msg-row received" onclick="openEditModal('err_not_found')">
                        <div class="bubble" style="border-left: 3px solid #e74c3c;"><span class="key-hint">err_not_found</span>${val('err_not_found')}<span class="time">10:08</span></div>
                    </div>

                    <div class="msg-row received" onclick="openEditModal('err_scan_fail')">
                        <div class="bubble" style="border-left: 3px solid #e74c3c;"><span class="key-hint">err_scan_fail</span>${val('err_scan_fail')}<span class="time">10:09</span></div>
                    </div>

                    <div class="date-divider">ADMIN & GROUP LOGS</div>

                    <!-- 7. GROUP LOGS -->
                    <div class="group-label">Public Payment Group</div>
                    <div class="msg-row received" onclick="openEditModal('group_dep_sub')">
                        <div class="bubble"><span class="key-hint">group_dep_sub</span>${val('group_dep_sub')}<span class="time">10:10</span><span class="edit-icon">✎</span></div>
                    </div>

                    <div class="msg-row received" onclick="openEditModal('group_dep_done')">
                        <div class="bubble"><span class="key-hint">group_dep_done</span>${val('group_dep_done')}<span class="time">10:11</span><span class="edit-icon">✎</span></div>
                    </div>

                    <!-- 8. ADMIN ALERTS -->
                    <div class="group-label" style="background: #e67e22;">Admin Alert</div>
                    <div class="msg-row received" onclick="openEditModal('admin_wd_req')">
                        <div class="bubble" style="background: #fffbe6;">
                            <span class="key-hint">admin_wd_req</span>
                            ${val('admin_wd_req')}
                            <div class="inline-kbd"><div class="kbd-btn" style="color:green">✅ APPROVE</div><div class="kbd-btn" style="color:red">❌ REJECT</div></div>
                            <span class="time">10:12</span><span class="edit-icon">✎</span>
                        </div>
                    </div>

                    <div class="msg-row received" onclick="openEditModal('group_wd_req')">
                        <div class="bubble"><span class="key-hint">group_wd_req</span>${val('group_wd_req')}<span class="time">10:12</span><span class="edit-icon">✎</span></div>
                    </div>
                </div>
            </div>

            <!-- Edit Modal -->
            <div class="modal fade" id="editModal" tabindex="-1" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:100;">
                <div class="modal-dialog" style="max-width:400px; margin: 100px auto; background:white; border-radius:15px; overflow:hidden;">
                    <form action="/admin/settings/update" method="POST">
                        <div style="padding:15px; background:#f5f5f5; border-bottom:1px solid #ddd; font-weight:bold;" id="modalKey">Edit Key</div>
                        <div style="padding:15px;">
                            <input type="hidden" name="key" id="inputKey">
                            <textarea name="value" id="inputValue" style="width:100%; height:120px; border:1px solid #ccc; border-radius:8px; padding:10px; font-family:inherit;"></textarea>
                        </div>
                        <div style="padding:10px; display:flex; gap:10px;">
                            <button type="button" onclick="closeModal()" style="flex:1; padding:10px; border:none; border-radius:8px;">Cancel</button>
                            <button type="submit" style="flex:1; padding:10px; border:none; border-radius:8px; background:var(--tg-blue); color:white; font-weight:bold;">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>

            <script>
                const settings = ${JSON.stringify(settingsMap)};
                function openEditModal(key) {
                    document.getElementById('inputKey').value = key;
                    document.getElementById('modalKey').innerText = "Edit: " + key;
                    document.getElementById('inputValue').value = settings[key] ? settings[key].value : "";
                    document.getElementById('editModal').style.display = 'block';
                }
                function closeModal() {
                    document.getElementById('editModal').style.display = 'none';
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