import { useMemo } from "react";
import { useTable } from "react-table";

const ProjectManager = ({ projects }) => {
  const columns = useMemo(
    () => [
      { Header: "Project Name", accessor: "name" },
      { Header: "Status", accessor: "status" },
      {
        Header: "Budget",
        accessor: "budget",
        Cell: ({ value }) => `$${value ? value.toLocaleString() : "0"}`,
      },
      {
        Header: "Start Date",
        accessor: "start_date",
        Cell: ({ value }) =>
          value ? new Date(value).toLocaleDateString() : "N/A",
      },
      { Header: "Members", accessor: "members", Cell: ({ value }) => value?.length || 0 },
    ],
    []
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({ columns, data: projects });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Project Portfolio</h3>
      <table {...getTableProps()} className="w-full border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()} key={headerGroup.id}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()} key={column.id} className="p-3 border border-gray-300">
                  {column.render("Header")}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()} key={row.id} className="hover:bg-gray-50">
                {row.cells.map((cell) => (
                  <td {...cell.getCellProps()} key={cell.column.id} className="p-3 border border-gray-300">
                    {cell.render("Cell")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
export default ProjectManager;
