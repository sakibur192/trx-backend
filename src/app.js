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
        
        // Convert rows to a lookup object for easy access
        const settings = {};
        result.rows.forEach(row => { settings[row.key] = row; });

        // Helper to render a bot message bubble
        const botMsg = (key, label) => {
            const s = settings[key];
            if (!s) return ''; // Skip if key missing in DB
            return `
                <div class="msg-group bot">
                    <div class="bubble shadow-sm">
                        <div class="msg-label">${label || s.label}</div>
                        <div class="msg-content" id="content-${s.key}">${s.value.replace(/\n/g, '<br>')}</div>
                        <div class="msg-footer">
                            <button class="btn-edit" onclick="openEditModal('${s.key}', '${s.label}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit
                            </button>
                        </div>
                    </div>
                </div>`;
        };

        // Helper for dummy user messages
        const userMsg = (text) => `
            <div class="msg-group user">
                <div class="bubble shadow-sm">${text}</div>
            </div>`;

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Bot Preview Admin</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { 
                        background-color: #8da6ba; background-image: url("https://www.transparenttextures.com/patterns/cubes.png");
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    }
                    .chat-container { max-width: 500px; margin: 20px auto; display: flex; flex-direction: column; }
                    
                    .chat-date { text-align: center; margin: 25px 0 15px; }
                    .chat-date span { background: rgba(0,0,0,0.3); color: white; padding: 4px 15px; border-radius: 20px; font-size: 12px; font-weight: 500; }

                    .msg-group { display: flex; width: 100%; margin-bottom: 8px; }
                    .msg-group.bot { justify-content: flex-start; }
                    .msg-group.user { justify-content: flex-end; }

                    .bubble { max-width: 80%; padding: 8px 12px; position: relative; font-size: 0.95rem; line-height: 1.4; }
                    
                    /* Bot Style */
                    .bot .bubble { 
                        background: #ffffff; color: #000; 
                        border-radius: 15px 15px 15px 5px; 
                    }
                    
                    /* User Style */
                    .user .bubble { 
                        background: #effdde; color: #000; 
                        border-radius: 15px 15px 5px 15px; 
                        margin-right: 5px;
                    }

                    .msg-label { color: #3390ec; font-weight: bold; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 2px; }
                    .msg-footer { display: flex; justify-content: flex-end; margin-top: 5px; border-top: 1px solid #f0f0f0; }
                    .btn-edit { background: none; border: none; color: #3390ec; font-size: 11px; font-weight: bold; padding: 4px 0 0; cursor: pointer; }
                    
                    /* Custom Scrollbar */
                    ::-webkit-scrollbar { width: 6px; }
                    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 10px; }
                </style>
            </head>
            <body>
                <nav class="navbar sticky-top shadow-sm" style="background: #517da2; color: white;">
                    <div class="container-fluid justify-content-center">
                        <span class="navbar-brand mb-0 h1" style="font-size: 16px;">💬 Simulation Mode</span>
                    </div>
                </nav>

                <div class="chat-container">
                    
                    <div class="chat-date"><span>START FLOW</span></div>
                    ${userMsg("/start")}
                    ${botMsg('main_menu_title', 'Main Menu')}

                    <div class="chat-date"><span>DEPOSIT FLOW</span></div>
                    ${userMsg("💰 Deposit")}
                    ${botMsg('dep_menu_title')}
                    ${userMsg("⌨️ Manual")}
                    ${botMsg('manual_entry_start')}
                    ${botMsg('m_step_1')}
                    ${userMsg("TRX123456789")}
                    ${botMsg('m_step_2')}
                    ${userMsg("500")}
                    ${botMsg('m_step_3')}
                    ${userMsg("Player_01")}
                    ${botMsg('verifying_status')}

                    <div class="chat-date"><span>WITHDRAW FLOW</span></div>
                    ${userMsg("💸 Withdraw")}
                    ${botMsg('withdraw_menu_title')}
                    ${userMsg("bKash")}
                    ${userMsg("01700000000")}
                    ${userMsg("1000")}
                    ${userMsg("Player_01")}
                    ${botMsg('wd_success_msg')}

                    <div class="chat-date"><span>NOTIFICATIONS & ALERTS</span></div>
                    ${botMsg('group_wd_req', 'Group Alert (Withdraw)')}
                    ${botMsg('admin_wd_req', 'Admin Alert (Withdraw)')}
                    ${botMsg('user_dep_success', 'User: Success Alert')}
                    ${botMsg('user_dep_rej', 'User: Rejected Alert')}

                </div>

                <!-- Shared Edit Modal -->
                <div class="modal fade" id="editModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <form action="/admin/settings/update" method="POST" class="modal-content border-0 shadow" style="border-radius: 20px;">
                            <div class="modal-header border-0">
                                <h6 class="modal-title" id="modalLabel" style="color: #3390ec; font-weight: bold;">Edit Content</h6>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body py-0">
                                <input type="hidden" name="key" id="modalKey">
                                <textarea name="value" id="modalValue" class="form-control border-0 bg-light" rows="6" style="resize: none; border-radius: 12px;" required></textarea>
                            </div>
                            <div class="modal-footer border-0">
                                <button type="submit" class="btn btn-primary w-100 rounded-pill" style="background: #3390ec;">Update Message</button>
                            </div>
                        </form>
                    </div>
                </div>

                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
                <script>
                    function openEditModal(key, label) {
                        const content = document.getElementById('content-' + key).innerText;
                        document.getElementById('modalKey').value = key;
                        document.getElementById('modalLabel').innerText = label;
                        document.getElementById('modalValue').value = content;
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