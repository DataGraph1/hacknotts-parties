// stolen from: https://mui.com/material-ui/react-table/

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';

const columns = [
	{
		id: 'id',
		label: 'ID',
		minWidth: 170,
	},
  { 
    id: 'team',
    label: 'Team',
    minWidth: 100
	},
  {
		id: 'amount',
		label: 'Amount',
		minWidth: 200
	},
  {
    id: 'isAlive',
    label: 'Exists',
    minWidth: 100,
  },
];

function createData(id, team, amount, isAlive ) {
  return { id, team, amount, isAlive };
}

const rows = [
  createData(6, 'PS3',		25,  true),
  createData(5, 'XBox360', 3,   true),
  createData(4, 'XBox360', 8,   true),
  createData(3, 'XBox360', 12,  true),
  createData(2, 'PS3', 		13,  true),
  createData(1, 'PS3', 		133, false),
  createData(0, 'PS3', 		52,  true),
];

export default function ColumnGroupingTable() {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.va, lue);
    setPage(0);
  };

  return (
    <Paper sx={{ width: '100%' }}>
      <TableContainer>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ minWidth: column.minWidth }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableHead>
          <TableBody>
            {rows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.code}>
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {typeof value === 'boolean'
                            ? (value ? 'TRUE' : 'FALSE')
                            : column.format && typeof value === 'number'
                              ? column.format(value)
                              : value}
                        </TableCell>
                      );id
                    })}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
