"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"

export type Contact = {
  _id?: string
  name: string
  phone: string
  gender: string
  // FIX: Changed from undefined to null to match the date function's output
  birthday?: string | null
  anniversary?: string | null
  status?: 'new' | 'duplicate' | 'invalid'
  message?: string
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
  {
    accessorKey: "gender",
    header: "Gender",
    cell: ({ row }) => <div className="capitalize">{row.getValue("gender")}</div>,
  },
  {
    accessorKey: "birthday",
    header: "Birthday",
  },
  {
    accessorKey: "anniversary",
    header: "Anniversary",
  },
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
]
