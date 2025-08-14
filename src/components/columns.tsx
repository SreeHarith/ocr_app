"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button" // Import Button
import { Edit, Trash2 } from "lucide-react" // Import icons

export type Contact = {
  name: string
  phone: string
}

export const columns: ColumnDef<Contact>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "phone",
    header: "Phone Number",
  },
  // ==================  NEW ACTION COLUMN  ==================
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row, table }) => {
      const contact = row.original

      return (
        <div className="text-right">
          <Button
            variant="ghost"
            size="icon"
            // @ts-ignore
            onClick={() => table.options.meta?.handleEditRow(row.index, contact)}
            className="mr-2"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            // @ts-ignore
            onClick={() => table.options.meta?.handleDeleteRow(row.index)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    },
  },
  // ==========================================================
]