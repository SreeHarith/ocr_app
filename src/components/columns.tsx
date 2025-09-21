"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"

export type Contact = {
  _id?: string
  name: string
  phone: string
  gender: string
  birthday?: string | null
  anniversary?: string | null
  status?: 'new' | 'duplicate' | 'invalid'
  message?: string
}

// Helper function to format the date
const formatDateToMonthDay = (dateString: unknown) => {
  if (typeof dateString === 'string' && dateString) {
    // Create a date object, adding 'T00:00:00' to ensure it's parsed in the local timezone
    const date = new Date(`${dateString}T00:00:00`);
    // Format to "Month Day", e.g., "February 29"
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }
  return ""; // Return an empty string if the date is not valid
};

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
    cell: ({ row }) => formatDateToMonthDay(row.getValue("birthday")),
  },
  {
    accessorKey: "anniversary",
    header: "Anniversary",
    cell: ({ row }) => formatDateToMonthDay(row.getValue("anniversary")),
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
