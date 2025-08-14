"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Trash2, PlusCircle } from "lucide-react"

interface ContactInfo {
  name: string;
  phone: string;
}

interface EditDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  data: ContactInfo[];
  onSave: (data: ContactInfo[]) => void;
}

export default function EditDialog({ isOpen, setIsOpen, data, onSave }: EditDialogProps) {
  const [editedData, setEditedData] = useState<ContactInfo[]>([]);

  useEffect(() => {
    if (data) {
      setEditedData(data);
    }
  }, [data]);

  const handleInputChange = (index: number, field: 'name' | 'phone', value: string) => {
    const updatedData = [...editedData];
    updatedData[index][field] = value;
    setEditedData(updatedData);
  };

  const removeContact = (index: number) => {
    const updatedData = editedData.filter((_, i) => i !== index);
    setEditedData(updatedData);
  };

  const addContact = () => {
    setEditedData([...editedData, { name: "", phone: "" }]);
  };

  const handleSaveClick = () => {
    const finalData = editedData.filter(contact => contact.name.trim() !== "" || contact.phone.trim() !== "");
    onSave(finalData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Verify Information</DialogTitle>
          <DialogDescription>
            Review and edit all contacts found in the image.
          </DialogDescription>
        </DialogHeader>
        
        {/* =================  NEW TABLE LAYOUT ================= */}
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/5">Name</TableHead>
                <TableHead className="w-2/5">Phone Number</TableHead>
                <TableHead className="w-1/5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedData.map((contact, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={contact.name}
                      onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                      placeholder="Enter name..."
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={contact.phone}
                      onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                      placeholder="Enter phone..."
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeContact(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* ====================================================== */}

        <div className="pt-4">
          <Button variant="outline" className="w-full" onClick={addContact}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Contact
          </Button>
        </div>

        <DialogFooter>
          <Button type="submit" onClick={handleSaveClick}>Save All Contacts</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}