"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"

export type Contact = {
  name: string
  phone: string
  gender: string // Add gender field
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
  // NEW GENDER COLUMN
  {
    accessorKey: "gender",
    header: "Gender",
    cell: ({ row }) => {
      const gender = row.getValue("gender") as string;
      // Capitalize the first letter for display
      return <div className="capitalize">{gender}</div>;
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row, table }) => {
      // ... (action cell code is unchanged)
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
]