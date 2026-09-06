import "./DataTable.css";

function DataTable({
  columns = [],
  data = [],
  rowKey,
  emptyMessage = "No records found.",
  onRowClick,
  className = "",
}) {
  const classes = ["ui-data-table-wrapper", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <table className="ui-data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length || 1}
                className="ui-data-table-empty"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const key =
                typeof rowKey === "function"
                  ? rowKey(row, index)
                  : row?.[rowKey] ?? index;

              return (
                <tr
                  key={key}
                  className={
                    onRowClick
                      ? "ui-data-table-clickable"
                      : ""
                  }
                  onClick={() =>
                    onRowClick?.(row, index)
                  }
                >
                  {columns.map((column) => (
                    <td key={column.key}>
                      {typeof column.render === "function"
                        ? column.render(row, index)
                        : row?.[column.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;