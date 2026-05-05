const pool = {
  query: jest.fn().mockResolvedValue([[], {}]),
  execute: jest.fn().mockResolvedValue([{ insertId: 1, affectedRows: 1 }, {}]),
}

export default pool
