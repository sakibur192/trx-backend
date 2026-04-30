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
        
        // Grouping data by category
        const categories = {};
        result.rows.forEach(row => {
            if (!categories[row.category]) categories[row.category] = [];
            categories[row.category].push(row);
        });

        // Mapping which keys represent "User Choices" to push them to the right side
        const userSideKeys = [
            'dep_ss', 'dep_manual', 'w_bkash', 'w_nagad', 'w_rocket', 'w_upay', 
            'manual_entry_start', 'ss_start', 'withdraw'
        ];

        let sectionsHtml = '';
        let sidebarHtml = '';

        for (const cat in categories) {
            const catId = cat.replace(/\s+/g, '_').toLowerCase();
            sidebarHtml += `<li><a href="#cat-${catId}">${cat.toUpperCase()}</a></li>`;
            
            sectionsHtml += `
                <div class="chat-date" id="cat-${catId}">
                    <span>${cat.toUpperCase()} (${categories[cat].length} KEYS)</span>
                </div>`;
            
            sectionsHtml += categories[cat].map(s => {
                const isUserSide = userSideKeys.some(k => s.key.includes(k));
                const sideClass = isUserSide ? 'msg-user' : 'msg-bot';
                
                return `
                <div class="message-wrapper ${sideClass}">
                    <div class="message-bubble shadow-sm">
                        <div class="msg-label">${s.label}</div>
                        <div class="msg-content" id="content-${s.key}">${s.value.replace(/\n/g, '<br>')}</div>
                        <div class="msg-footer">
                            <button class="btn-edit" onclick="openEditModal('${s.key}', '${s.label}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit <code>${s.key}</code>
                            </button>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Aesthetic Bot Admin (29 Keys)</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    :root { --tg-bg: #8da6ba; --tg-bot: #ffffff; --tg-user: #effdde; --tg-accent: #3390ec; }
                    body { 
                        background-color: var(--tg-bg); background-image: url("https://www.transparenttextures.com/patterns/cubes.png");
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        display: flex;
                    }
                    /* Sidebar Navigation */
                    .sidebar {
                        width: 250px; height: 100vh; background: rgba(255,255,255,0.1); 
                        backdrop-filter: blur(10px); position: sticky; top: 0; padding: 20px;
                        border-right: 1px solid rgba(255,255,255,0.1); overflow-y: auto; color: white;
                    }
                    .sidebar h4 { font-size: 0.9rem; font-weight: bold; margin-bottom: 20px; opacity: 0.8; }
                    .sidebar ul { list-style: none; padding: 0; }
                    .sidebar ul li a { color: white; text-decoration: none; font-size: 0.8rem; display: block; padding: 8px 0; opacity: 0.7; transition: 0.3s; }
                    .sidebar ul li a:hover { opacity: 1; padding-left: 5px; }

                    .main-content { flex: 1; padding: 20px; height: 100vh; overflow-y: auto; scroll-behavior: smooth; }
                    .chat-container { max-width: 600px; margin: auto; }

                    .chat-date { text-align: center; margin: 40px 0 20px; clear: both; }
                    .chat-date span { background: rgba(0,0,0,0.3); color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }

                    .message-wrapper { display: flex; width: 100%; margin-bottom: 12px; }
                    .msg-bot { justify-content: flex-start; }
                    .msg-user { justify-content: flex-end; }

                    .message-bubble { padding: 12px 16px; max-width: 85%; border-radius: 18px; position: relative; border: 1px solid rgba(0,0,0,0.05); }
                    .msg-bot .message-bubble { background: var(--tg-bot); border-bottom-left-radius: 4px; }
                    .msg-user .message-bubble { background: var(--tg-user); border-bottom-right-radius: 4px; text-align: right; }

                    .msg-label { color: var(--tg-accent); font-weight: 800; font-size: 0.65rem; text-transform: uppercase; margin-bottom: 5px; }
                    .msg-content { font-size: 0.92rem; line-height: 1.5; color: #111; }
                    .msg-footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid rgba(0,0,0,0.04); display: flex; justify-content: flex-end; }
                    
                    .btn-edit { background: none; border: none; color: var(--tg-accent); font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; gap: 5px; cursor: pointer; }
                    code { background: #f4f4f4; color: #e83e8c; padding: 2px 4px; border-radius: 4px; }

                    .modal-content { border-radius: 25px; border: none; }
                    .modal-header { border-bottom: none; padding: 25px 25px 0; }
                    .modal-footer { border-top: none; padding: 0 25px 25px; }
                    textarea { border-radius: 15px !important; border: 1px solid #eee !important; background: #f9f9f9 !important; font-size: 0.95rem !important; }
                </style>
            </head>
            <body>
                <div class="sidebar d-none d-lg-block">
                    <h4>📂 CATEGORIES</h4>
                    <ul>${sidebarHtml}</ul>
                    <hr style="opacity: 0.2">
                    <div class="small opacity-50">Total Active Keys: 29</div>
                </div>

                <div class="main-content">
                    <div class="chat-container">
                        ${sectionsHtml}
                    </div>
                </div>

                <!-- Edit Modal -->
                <div class="modal fade" id="editModal" tabindex="-1">
                  <div class="modal-dialog modal-dialog-centered">
                    <form action="/admin/settings/update" method="POST" class="modal-content shadow-lg">
                      <div class="modal-header">
                        <h5 class="modal-title" id="modalLabel" style="color: var(--tg-accent); font-weight: bold;">Edit Content</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div class="modal-body px-4">
                          <input type="hidden" name="key" id="modalKey">
                          <div class="mb-3">
                              <label class="small text-muted mb-2">Key: <code id="displayKey"></code></label>
                              <textarea name="value" id="modalValue" class="form-control" rows="8" required></textarea>
                          </div>
                      </div>
                      <div class="modal-footer">
                          <button type="submit" class="btn btn-primary w-100 rounded-pill py-2" style="background: var(--tg-accent); border: none; font-weight: 600;">Apply Changes</button>
                      </div>
                    </form>
                  </div>
                </div>

                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
                <script>
                    function openEditModal(key, label) {
                        const content = document.getElementById('content-' + key).innerText;
                        document.getElementById('modalKey').value = key;
                        document.getElementById('displayKey').innerText = key;
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