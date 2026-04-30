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

        // Helper to get value and preserve line breaks for the preview
        const val = (key) => (settingsMap[key] ? settingsMap[key].value.replace(/\n/g, '<br>') : `<span style="color:red; font-weight:bold;">[MISSING: ${key}]</span>`);

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>Telegram Bot Simulator</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    :root { 
                        --tg-bg: #8da6ba; 
                        --tg-sent: #effdde; 
                        --tg-received: #ffffff; 
                        --tg-blue: #3390ec; 
                        --tg-header: #517da2;
                        --tg-meta: #a0acb6;
                    }
                    body { 
                        background-color: #e6ebee; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        margin: 0; padding: 0;
                    }
                    
                    /* Telegram App UI Container */
                    .tg-app { max-width: 480px; margin: 0 auto; height: 100vh; display: flex; flex-direction: column; background: var(--tg-bg) url("https://www.transparenttextures.com/patterns/cubes.png"); position: relative; }
                    
                    /* Header */
                    .tg-header { background: var(--tg-header); color: white; padding: 10px 15px; display: flex; align-items: center; gap: 15px; flex-shrink: 0; }
                    .tg-header-info { line-height: 1.2; }
                    .tg-header-name { font-weight: bold; font-size: 16px; display: block; }
                    .tg-header-status { font-size: 12px; opacity: 0.8; }

                    /* Chat Area */
                    .tg-content { flex-grow: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
                    .date-divider { align-self: center; background: rgba(74, 99, 120, 0.4); color: white; padding: 2px 12px; border-radius: 12px; font-size: 11px; margin: 15px 0; font-weight: 500; text-transform: uppercase; }

                    /* Message Bubbles */
                    .msg-row { display: flex; flex-direction: column; width: 100%; position: relative; }
                    .received { align-items: flex-start; }
                    .sent { align-items: flex-end; }
                    
                    .bubble { 
                        max-width: 85%; padding: 6px 12px; border-radius: 15px; position: relative; 
                        box-shadow: 0 1px 1px rgba(0,0,0,0.1); cursor: pointer; border: 2px solid transparent; 
                        line-height: 1.4; font-size: 14.5px; transition: all 0.2s;
                    }
                    .received .bubble { background: var(--tg-received); border-bottom-left-radius: 4px; color: #000; }
                    .sent .bubble { background: var(--tg-sent); border-bottom-right-radius: 4px; color: #000; }
                    
                    /* Interactive Hover */
                    .bubble:hover { border-color: var(--tg-blue); transform: scale(1.01); filter: brightness(0.98); }
                    .key-badge { display: block; font-size: 9px; color: var(--tg-blue); font-weight: bold; text-transform: uppercase; margin-bottom: 2px; border-bottom: 1px solid #eee; }

                    /* Keyboards */
                    .tg-kbd { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 8px; }
                    .tg-btn { background: rgba(255,255,255,0.7); border: 1px solid rgba(0,0,0,0.05); border-radius: 6px; padding: 6px; text-align: center; font-size: 13px; color: var(--tg-blue); font-weight: 500; }
                    
                    /* System/Admin Labels */
                    .sys-label { font-size: 10px; color: #fff; background: rgba(0,0,0,0.3); padding: 1px 6px; border-radius: 4px; margin-bottom: 2px; align-self: flex-start; }
                    .time { font-size: 10px; color: var(--tg-meta); float: right; margin: 6px 0 0 8px; }
                </style>
            </head>
            <body>

            <div class="tg-app">
                <div class="tg-header">
                    <div style="font-size: 20px;">☰</div>
                    <div class="tg-header-info">
                        <span class="tg-header-name">Bot Settings (29 Keys)</span>
                        <span class="tg-header-status">Live Chat Simulator</span>
                    </div>
                </div>

                <div class="tg-content">
                    <div class="date-divider">Phase 1: Main & Deposit</div>

                    <!-- /START -->
                    <div class="msg-row sent"><div class="bubble">/start<span class="time">10:00</span></div></div>
                    <div class="msg-row received" onclick="openEditModal('main_menu_title')">
                        <div class="bubble">
                            <span class="key-badge">main_menu_title</span>
                            ${val('main_menu_title')}
                            <div class="tg-kbd"><div class="tg-btn">💰 Deposit</div><div class="tg-btn">💸 Withdraw</div></div>
                        </div>
                    </div>

                    <!-- SCREENSHOT FLOW -->
                    <div class="msg-row sent"><div class="bubble">Deposit</div></div>
                    <div class="msg-row received" onclick="openEditModal('dep_menu_title')">
                        <div class="bubble">
                            <span class="key-badge">dep_menu_title</span>
                            ${val('dep_menu_title')}
                            <div class="tg-kbd"><div class="tg-btn">📸 Screenshot</div><div class="tg-btn">⌨️ Manual</div></div>
                        </div>
                    </div>
                    
                    <div class="msg-row sent"><div class="bubble">Screenshot</div></div>
                    <div class="msg-row received" onclick="openEditModal('ss_start')">
                        <div class="bubble"><span class="key-badge">ss_start</span>${val('ss_start')}</div>
                    </div>

                    <!-- MANUAL FLOW -->
                    <div class="msg-row sent"><div class="bubble">Manual Entry</div></div>
                    <div class="msg-row received" onclick="openEditModal('manual_entry_start')">
                        <div class="bubble">
                            <span class="key-badge">manual_entry_start + m_step_1</span>
                            ${val('manual_entry_start')}<br><br>${val('m_step_1')}
                        </div>
                    </div>

                    <div class="msg-row sent"><div class="bubble">TRX123456789</div></div>
                    <div class="msg-row received" onclick="openEditModal('m_step_2')">
                        <div class="bubble"><span class="key-badge">m_step_2</span>${val('m_step_2')}</div>
                    </div>

                    <div class="msg-row sent"><div class="bubble">500</div></div>
                    <div class="msg-row received" onclick="openEditModal('m_step_3')">
                        <div class="bubble"><span class="key-badge">m_step_3</span>${val('m_step_3')}</div>
                    </div>

                    <div class="msg-row sent"><div class="bubble">USER_ID_789</div></div>
                    <div class="msg-row received" onclick="openEditModal('verifying_status')">
                        <div class="bubble"><span class="key-badge">verifying_status</span><i>${val('verifying_status')}</i></div>
                    </div>

                    <div class="msg-row received" onclick="openEditModal('user_dep_success')">
                        <div class="bubble"><span class="key-badge">user_dep_success</span>${val('user_dep_success')}</div>
                    </div>

                    <div class="date-divider">Phase 2: Withdraw Flow</div>

                    <div class="msg-row sent"><div class="bubble">Withdraw</div></div>
                    <div class="msg-row received" onclick="openEditModal('withdraw_menu_title')">
                        <div class="bubble">
                            <span class="key-badge">withdraw_menu_title</span>
                            ${val('withdraw_menu_title')}
                            <div class="tg-kbd"><div class="tg-btn">bKash</div><div class="tg-btn">Nagad</div></div>
                        </div>
                    </div>

                    <div class="msg-row received" onclick="openEditModal('wd_success_msg')">
                        <div class="bubble"><span class="key-badge">wd_success_msg</span>${val('wd_success_msg')}</div>
                    </div>

                    <div class="msg-row received" onclick="openEditModal('user_wd_paid')">
                        <div class="bubble" style="background:#d1f7ff"><span class="key-badge">user_wd_paid</span>${val('user_wd_paid')}</div>
                    </div>

                    <div class="date-divider">Phase 3: Errors & Alerts</div>

                    <div class="msg-row received" onclick="openEditModal('err_invalid_format')">
                        <div class="bubble" style="border-left: 4px solid #e74c3c;"><span class="key-badge">err_invalid_format</span>${val('err_invalid_format')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditModal('err_not_found')">
                        <div class="bubble" style="border-left: 4px solid #e74c3c;"><span class="key-badge">err_not_found</span>${val('err_not_found')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditModal('err_scan_fail')">
                        <div class="bubble" style="border-left: 4px solid #e74c3c;"><span class="key-badge">err_scan_fail</span>${val('err_scan_fail')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditModal('user_dep_rej')">
                        <div class="bubble" style="border-left: 4px solid #e74c3c;"><span class="key-badge">user_dep_rej</span>${val('user_dep_rej')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditModal('user_wd_rej')">
                        <div class="bubble" style="border-left: 4px solid #e74c3c;"><span class="key-badge">user_wd_rej</span>${val('user_wd_rej')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditModal('err_low_bal')">
                        <div class="bubble" style="border-left: 4px solid #e74c3c;"><span class="key-badge">err_low_bal</span>${val('err_low_bal')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditModal('err_timeout')">
                        <div class="bubble" style="border-left: 4px solid #e74c3c;"><span class="key-badge">err_timeout</span>${val('err_timeout')}</div>
                    </div>

                    <div class="date-divider">Phase 4: Group & Admin Logs</div>

                    <div class="sys-label">Public Payment Group</div>
                    <div class="msg-row received" onclick="openEditModal('group_dep_sub')">
                        <div class="bubble"><span class="key-badge">group_dep_sub</span>${val('group_dep_sub')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditModal('group_dep_done')">
                        <div class="bubble"><span class="key-badge">group_dep_done</span>${val('group_dep_done')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditModal('group_wd_req')">
                        <div class="bubble"><span class="key-badge">group_wd_req</span>${val('group_wd_req')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditModal('group_wd_done')">
                        <div class="bubble"><span class="key-badge">group_wd_done</span>${val('group_wd_done')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditModal('group_wd_fail')">
                        <div class="bubble"><span class="key-badge">group_wd_fail</span>${val('group_wd_fail')}</div>
                    </div>

                    <div class="sys-label" style="background:#444">Admin Internal Channel</div>
                    <div class="msg-row received" onclick="openEditModal('admin_wd_req')">
                        <div class="bubble" style="background:#fffbe6">
                            <span class="key-badge">admin_wd_req</span>
                            ${val('admin_wd_req')}
                            <div class="tg-kbd"><div class="tg-btn" style="color:green">DONE</div><div class="tg-btn" style="color:red">REJECT</div></div>
                        </div>
                    </div>
                    <div class="msg-row received" onclick="openEditor('admin_dep_req')">
                        <div class="bubble" style="background:#fffbe6"><span class="key-badge">admin_dep_req</span>${val('admin_dep_req')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditor('admin_new_user')">
                        <div class="bubble" style="background:#fffbe6"><span class="key-badge">admin_new_user</span>${val('admin_new_user')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditor('group_stats_daily')">
                        <div class="bubble" style="background:#fffbe6"><span class="key-badge">group_stats_daily</span>${val('group_stats_daily')}</div>
                    </div>
                    <div class="msg-row received" onclick="openEditor('admin_alert_low_liq')">
                        <div class="bubble" style="background:#fffbe6; border:1px solid orange"><span class="key-badge">admin_alert_low_liq</span>${val('admin_alert_low_liq')}</div>
                    </div>
                </div>
            </div>

            <!-- Edit Modal -->
            <div class="modal fade" id="editModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <form class="modal-content shadow-lg border-0" action="/admin/settings/update" method="POST" style="border-radius:15px">
                        <div class="modal-header border-0">
                            <h6 class="modal-title fw-bold" id="modalLabel" style="color: var(--tg-blue);">Edit Message</h6>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" name="key" id="modalKey">
                            <textarea name="value" id="modalValue" class="form-control" rows="6" style="border-radius:10px; font-size:14px;"></textarea>
                        </div>
                        <div class="modal-footer border-0">
                            <button type="submit" class="btn btn-primary w-100 rounded-pill py-2" style="background:var(--tg-blue)">Update Bot Content</button>
                        </div>
                    </form>
                </div>
            </div>

            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
            <script>
                const data = ${JSON.stringify(settingsMap)};
                function openEditModal(key) {
                    document.getElementById('modalKey').value = key;
                    document.getElementById('modalLabel').innerText = "Edit: " + key;
                    document.getElementById('modalValue').value = data[key] ? data[key].value : "";
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