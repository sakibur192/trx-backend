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
        
        const categories = {};
        result.rows.forEach(row => {
            if (!categories[row.category]) categories[row.category] = [];
            categories[row.category].push(row);
        });

        let sectionsHtml = '';
        for (const cat in categories) {
            // Category Header (Date Separator)
            sectionsHtml += `<div class="tg-date-wrap"><span>${cat.toUpperCase()}</span></div>`;
            
            sectionsHtml += categories[cat].map(s => `
                <div class="tg-msg-row">
                    <!-- Bot Avatar -->
                    <div class="tg-avatar">
                        <div class="tg-avatar-circle" style="background: linear-gradient(135deg, #6ab3f3, #3390ec)">
                            ${s.category.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    
                    <div class="tg-bubble-container">
                        <div class="tg-bubble shadow-sm">
                            <!-- Telegram's unique corner tail -->
                            <div class="tg-tail">
                                <svg width="9" height="20" viewBox="0 0 9 20" fill="none"><path d="M7 17.5L0 20V0C0 0 0.0585938 10.4414 7 17.5Z" fill="white"/></svg>
                            </div>
                            
                            <div class="tg-msg-content">
                                <div class="tg-sender-name">${s.label}</div>
                                <div class="tg-text" id="content-${s.key}">${s.value.replace(/\n/g, '<br>')}</div>
                                
                                <div class="tg-meta">
                                    <span class="tg-time">${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, '0')}</span>
                                    <button class="tg-edit-btn" onclick="openEditModal('${s.key}', '${s.label}')">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>Bot Configuration</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    :root {
                        --tg-bg: #8da6ba;
                        --tg-header: #517da2;
                        --tg-link: #3390ec;
                        --tg-bubble-white: #ffffff;
                    }

                    body { 
                        background-color: var(--tg-bg);
                        background-image: url("https://www.transparenttextures.com/patterns/cubes.png"); /* Classic TG Pattern */
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        margin: 0;
                    }

                    /* Header */
                    .tg-nav { background: var(--tg-header); color: white; padding: 10px 15px; position: sticky; top: 0; z-index: 1000; display: flex; align-items: center; gap: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                    .tg-nav-title { font-weight: 600; font-size: 1.1rem; flex-grow: 1; margin: 0; }

                    .chat-view { max-width: 600px; margin: auto; padding: 10px; }

                    /* Date Separator */
                    .tg-date-wrap { text-align: center; margin: 20px 0; }
                    .tg-date-wrap span { 
                        background: rgba(74, 99, 120, 0.7); color: white; 
                        padding: 4px 12px; border-radius: 15px; font-size: 0.75rem; font-weight: 500; 
                    }

                    /* Message Row */
                    .tg-msg-row { display: flex; align-items: flex-end; margin-bottom: 12px; }
                    .tg-avatar { width: 35px; height: 35px; margin-right: 8px; flex-shrink: 0; }
                    .tg-avatar-circle { 
                        width: 100%; height: 100%; border-radius: 50%; 
                        color: white; display: flex; align-items: center; justify-content: center; 
                        font-weight: bold; font-size: 0.8rem;
                    }

                    /* Bubble Logic */
                    .tg-bubble-container { position: relative; max-width: 85%; }
                    .tg-bubble { 
                        background: var(--tg-bubble-white); 
                        border-radius: 15px 15px 15px 4px; 
                        padding: 6px 10px 4px 12px; 
                        position: relative;
                    }
                    .tg-tail { position: absolute; left: -7px; bottom: 0; }

                    .tg-sender-name { color: var(--tg-link); font-weight: 600; font-size: 0.85rem; margin-bottom: 2px; }
                    .tg-text { font-size: 0.95rem; line-height: 1.4; color: #000; word-break: break-word; white-space: pre-wrap; }

                    /* Timestamp & Meta */
                    .tg-meta { 
                        display: flex; align-items: center; justify-content: flex-end; 
                        gap: 5px; margin-top: -5px; float: right; margin-left: 10px; 
                        position: relative; top: 5px;
                    }
                    .tg-time { color: #a0acb6; font-size: 0.7rem; }
                    .tg-edit-btn { 
                        background: none; border: none; color: var(--tg-link); 
                        cursor: pointer; padding: 0; display: flex; opacity: 0.6;
                    }
                    .tg-edit-btn:hover { opacity: 1; }

                    /* Modal Overrides */
                    .modal-content { border-radius: 20px; border: none; }
                    .form-control:focus { border-color: var(--tg-link); box-shadow: none; }
                </style>
            </head>
            <body>
                <div class="tg-nav">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" /></svg>
                    <div class="tg-nav-title">Configuration Bot</div>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg>
                </div>

                <div class="chat-view">
                    ${sectionsHtml}
                </div>

                <!-- Modal remains largely the same but with rounded-pill buttons -->
                <div class="modal fade" id="editModal" tabindex="-1">
                  <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content p-2">
                      <div class="modal-header border-0">
                        <h5 class="modal-title fw-bold" id="modalLabel" style="color: var(--tg-link)">Edit Message</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <form action="/admin/settings/update" method="POST">
                        <div class="modal-body">
                            <input type="hidden" name="key" id="modalKey">
                            <textarea name="value" id="modalValue" class="form-control" rows="8" style="background: #f1f1f1; border:none; border-radius: 15px;"></textarea>
                        </div>
                        <div class="modal-footer border-0">
                            <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary rounded-pill px-4" style="background: var(--tg-link)">Save Changes</button>
                        </div>
                      </form>
                    </div>
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