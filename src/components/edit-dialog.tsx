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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Trash2, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"

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

interface DuplicateInfo {
  isDuplicate: boolean;
  originalIndex: number | null;
}

export default function EditDialog({ isOpen, setIsOpen, data, onSave }: EditDialogProps) {
  const [editedData, setEditedData] = useState<ContactInfo[]>([]);

  useEffect(() => {
    if (data) setEditedData(data);
  }, [data]);

  const handleInputChange = (index: number, field: 'name' | 'phone', value: string) => {
    const updatedData = [...editedData];
    updatedData[index][field] = value;
    setEditedData(updatedData);
  };

  const removeContact = (index: number) => {
    setEditedData(editedData.filter((_, i) => i !== index));
  };

  const addContact = () => {
    setEditedData([...editedData, { name: "", phone: "" }]);
  };

  const getDuplicateInfo = (currentIndex: number): DuplicateInfo => {
    const currentContact = editedData[currentIndex];
    const currentPhone = currentContact.phone.trim();
    if (!currentPhone) return { isDuplicate: false, originalIndex: null };
    for (let i = 0; i < currentIndex; i++) {
      const prevContact = editedData[i];
      const prevPhone = prevContact.phone.trim();
      if (prevPhone === currentPhone) {
        return { isDuplicate: true, originalIndex: i };
      }
    }
    return { isDuplicate: false, originalIndex: null };
  };

  const handleSaveClick = () => {
    const hasDuplicates = editedData.some((_, index) => getDuplicateInfo(index).isDuplicate);
    if (hasDuplicates) {
      if (!confirm("Duplicate phone numbers were found. Are you sure you want to save?")) {
        return;
      }
    }
    const finalData = editedData.filter(contact => contact.name.trim() !== "" || contact.phone.trim() !== "");
    onSave(finalData);
  };

  const handleDeleteDuplicates = () => {
    const nonDuplicates = editedData.filter((_, index) => !getDuplicateInfo(index).isDuplicate);
    setEditedData(nonDuplicates);
  };

  const hasDuplicates = editedData.some((_, index) => getDuplicateInfo(index).isDuplicate);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <TooltipProvider>
          <DialogHeader>
            <DialogTitle>Verify Information</DialogTitle>
            <DialogDescription>
              Review and edit contacts. Hover over red rows to see the original entry.
            </DialogDescription>
          </DialogHeader>

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
                {editedData.map((contact, index) => {
                  const duplicateInfo = getDuplicateInfo(index);
                  
                  // ==================  THE FIX IS HERE  ==================
                  // Added specific hover classes for the duplicate rows
                  const highlightClass = duplicateInfo.isDuplicate 
                    ? "bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/60" 
                    : "";
                  // ========================================================
                  
                  return (
                    <Tooltip key={index} delayDuration={300}>
                      <TooltipTrigger asChild>
                        <TableRow className={cn("transition-colors", highlightClass)}>
                          <TableCell>
                            <Input
                              value={contact.name}
                              onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                              placeholder="Enter name..."
                              className="bg-transparent"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={contact.phone}
                              onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                              placeholder="Enter phone..."
                              className="bg-transparent"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => removeContact(index)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TooltipTrigger>
                      {duplicateInfo.isDuplicate && (
                        <TooltipContent>
                          <p>Duplicate of row #{duplicateInfo.originalIndex! + 1} ({editedData[duplicateInfo.originalIndex!].name})</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="pt-4">
            <Button variant="outline" className="w-full" onClick={addContact}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Contact
            </Button>
          </div>

          <DialogFooter className="sm:justify-between">
            {hasDuplicates ? (
              <Button variant="destructive" onClick={handleDeleteDuplicates}>
                Delete all Duplicates
              </Button>
            ) : (
              <div />
            )}
            <Button type="submit" onClick={handleSaveClick}>Save All Contacts</Button>
          </DialogFooter>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}