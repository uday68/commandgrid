import { useMemo, useState } from "react";
import { useTable, useGlobalFilter } from "react-table";
import { FiList, FiSearch, FiClock } from "react-icons/fi";

const AuditLogs = ({ logs }) => {
  const [filterText, setFilterText] = useState("");

  const columns = useMemo(
    () => [
      {
        Header: "Timestamp",
        accessor: "created_at",
        Cell: ({ value }) => (value ? new Date(value).toLocaleString() : "N/A"),
      },
      { Header: "Action", accessor: "action" },
      {
        Header: "User",
        accessor: "user_id",
        Cell: ({ value }) => (value ? value.name : "System"),
      },
      {
        Header: "Project",
        accessor: "project_id",
        Cell: ({ value }) => (value ? value.name : "N/A"),
      },
    ],
    []
  );

  const data = useMemo(() =>Array.isArray(logs)? logs:[] ,[logs]);

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow, setGlobalFilter } =
    useTable({ columns, data }, useGlobalFilter);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center mb-6">
        <FiList className="text-2xl mr-2" />
        <h3 className="text-xl font-semibold">Activity Audit Trail</h3>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center mb-4 gap-4">
        <div className="flex items-center bg-gray-100 p-2 rounded-lg w-64">
          <FiSearch className="mr-2" />
          <input
            type="text"
            placeholder="Search logs..."
            className="bg-transparent outline-none w-full"
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value);
              setGlobalFilter(e.target.value);
            }}
          />
        </div>
        <div className="flex items-center bg-gray-100 p-2 rounded-lg">
          <FiClock className="mr-2" />
          <select className="bg-transparent outline-none">
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>All time</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <table {...getTableProps()} className="w-full border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          {headerGroups.map((headerGroup,index) => (
            <tr {...headerGroup.getHeaderGroupProps()} key={index}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()} key={column.id} className="p-3 border border-gray-300 text-left">
                  {column.render("Header")}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.length > 0 ? (
            rows.map((row,index) => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()} key={index} className="hover:bg-gray-50">
                  {row.cells.map((cell) => (
                    <td {...cell.getCellProps()} key={cell.column.id} className="p-3 border border-gray-300">
                      {cell.render("Cell")}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center p-4">
                No logs found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogs;
