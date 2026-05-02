// const { Pool } = require('pg');

// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'trx_db',
//   password: 'your_password',
//   port: 5432,
// });

// module.exports = pool;


// const { Pool } = require('pg');

// const pool = new Pool({
//   connectionString: 'postgresql://trxpostgres_user:Kj0VjTZr60rqk3OifIvLprSb7jICA0hl@dpg-d7nlfi7lk1mc73d5mk80-a.oregon-postgres.render.com/trxpostgres',
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

// module.exports = pool;







const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://trxuser:StrongPass123@187.127.145.228:5432/trxdb',
  ssl: false
});



pool.query('SELECT inet_server_addr()', (err, res) => {
  console.log("DB SERVER:", res.rows[0]);
});

module.exports = pool;