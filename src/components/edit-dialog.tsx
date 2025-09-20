"use client"

import { useEffect, useState, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, PlusCircle, AlertCircle, CheckCircle, Copy, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js"
import { Contact } from "./columns"

type DialogMode = 'csv' | 'ocr' | 'edit';

interface EditDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  data: Contact[];
  onSave: (data: Contact[]) => void;
  mode: DialogMode;
}

const DEFAULT_COUNTRY: CountryCode = "IN";

const toE164 = (raw: string, country?: CountryCode): string => {
  const parsed = parsePhoneNumberFromString(raw?.trim() ?? "", country || DEFAULT_COUNTRY);
  return parsed?.number ?? (raw?.trim() ?? "");
};

const getValidationError = (name: string, phone: string): string | null => {
  if (!name || !name.trim()) return "Name is required.";
  if (!phone || !phone.trim()) return "Phone is required.";
  const parsed = parsePhoneNumberFromString(phone, DEFAULT_COUNTRY);
  if (!parsed || !parsed.isValid()) {
    return "Invalid phone number format.";
  }
  if (parsed.country === 'IN') {
    if (!/^[6789]\d{9}$/.test(parsed.nationalNumber)) {
      return "Invalid Indian mobile number.";
    }
  }
  return null;
};

export default function EditDialog({ isOpen, setIsOpen, data, onSave, mode }: EditDialogProps) {
  const [editedData, setEditedData] = useState<Contact[]>([]);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});

  const runInternalValidation = (contacts: Contact[]): Contact[] => {
    const seenPhones = new Set<string>();
    return contacts.map(contact => {
      if (contact.status === 'duplicate' && contact.message?.includes('Exists in DB')) {
        seenPhones.add(toE164(contact.phone));
        return contact;
      }
      const phoneE164 = toE164(contact.phone);
      const validationError = getValidationError(contact.name, contact.phone);
      if (validationError) {
        return { ...contact, status: 'invalid', message: validationError };
      }
      if (phoneE164 && seenPhones.has(phoneE164)) {
          return { ...contact, status: 'duplicate', message: 'Duplicate within this list.' };
      }
      if(phoneE164) seenPhones.add(phoneE164);
      return { ...contact, status: 'new', message: 'Ready to save.' };
    });
  };

  useEffect(() => {
    if (data) {
        const processedData = runInternalValidation(data);
        setEditedData(processedData);
        const initialSelection: Record<number, boolean> = {};
        if (mode === 'csv') {
            processedData.forEach((contact, index) => {
            if (contact.status === 'new') initialSelection[index] = true;
            });
        }
        setSelectedRows(initialSelection);
    }
  }, [data, mode]);

  const handleInputChange = (index: number, field: 'name' | 'phone' | 'gender' | 'birthday' | 'anniversary', value: string) => {
    setEditedData(prevData => {
      const updated = [...prevData];
      updated[index] = { ...updated[index], [field]: value };
      return runInternalValidation(updated);
    });
  };
  
  const removeContact = (index: number) => {
    setEditedData(prev => runInternalValidation(prev.filter((_, i) => i !== index)));
  };

  const addContact = () => {
    const newContact: Contact = { name: "", phone: "", gender: "unknown", status: 'invalid', message: 'Name is required.' };
    setEditedData(prev => [...prev, newContact]);
  }

  const handleSaveClick = () => {
    if (mode === 'csv') {
      const dataToSave = editedData.filter((_, index) => selectedRows[index]);
      onSave(dataToSave);
    } else {
      if (editedData.some(c => c.status === 'invalid')) {
        alert("Please fix all invalid contacts before saving.");
        return;
      }
      const dataToSave = editedData.filter(c => c.status !== 'duplicate');
      onSave(dataToSave);
    }
  };
  
  const handleRemoveDuplicates = () => {
    setEditedData(prev => prev.filter(c => c.status !== 'duplicate'));
  };

  const handleRemoveInvalids = () => {
    setEditedData(prev => prev.filter(c => c.status !== 'invalid'));
  };

  const getStatusIcon = (status?: string): ReactNode => {
    switch (status) {
      case 'new': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'duplicate': return <Copy className="h-4 w-4 text-yellow-500" />;
      case 'invalid': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };
  
  const getRowClass = (status?: string): string => {
    if (status === 'duplicate') return "bg-yellow-50 dark:bg-yellow-900/20";
    if (status === 'invalid') return "bg-red-50 dark:bg-red-900/20";
    return "";
  };
  
  const hasDuplicates = editedData.some(c => c.status === 'duplicate');
  const hasInvalids = editedData.some(c => c.status === 'invalid');

  const tableHeaders: ReactNode[] = [];
  if (mode === 'csv') {
    tableHeaders.push(<TableHead key="select" className="w-[50px]"><Checkbox 
        onCheckedChange={(checked) => {
            const newSelection: Record<number, boolean> = {};
            if(checked) editedData.forEach((c, i) => { if(c.status === 'new') newSelection[i] = true; });
            setSelectedRows(newSelection);
        }}
    /></TableHead>);
  }
  tableHeaders.push(<TableHead key="name">Name</TableHead>);
  tableHeaders.push(<TableHead key="phone">Phone Number</TableHead>);
  tableHeaders.push(<TableHead key="gender">Gender</TableHead>);
  tableHeaders.push(<TableHead key="birthday">Birthday</TableHead>);
  tableHeaders.push(<TableHead key="anniversary">Anniversary</TableHead>);
  if (mode !== 'edit') {
    tableHeaders.push(<TableHead key="status">Status</TableHead>);
  }
  if (mode !== 'csv') {
    tableHeaders.push(<TableHead key="actions" className="text-right">Actions</TableHead>);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>Verify Information</DialogTitle>
          <DialogDescription>
            {mode === 'csv' && "Review contacts from your CSV. Only selected rows will be imported."}
            {mode === 'ocr' && "Review contacts from the image. Duplicates and invalid rows will not be saved."}
            {mode === 'edit' && "Edit the contact's details before saving."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <Table>
            <TableHeader>
              <TableRow>{tableHeaders}</TableRow>
            </TableHeader>
            <TableBody>
              {editedData.map((contact, index) => (
                <TableRow key={index} className={getRowClass(contact.status)}>
                  {mode === 'csv' && <TableCell><Checkbox 
                    checked={selectedRows[index] || false}
                    onCheckedChange={(checked) => setSelectedRows(prev => ({...prev, [index]: !!checked}))}
                    disabled={contact.status !== 'new'}
                  /></TableCell>}
                  <TableCell><Input value={contact.name} onChange={(e) => handleInputChange(index, 'name', e.target.value)} /></TableCell>
                  <TableCell><Input value={contact.phone} onChange={(e) => handleInputChange(index, 'phone', e.target.value)} /></TableCell>
                  <TableCell>
                    <Select value={contact.gender} onValueChange={(value) => handleInputChange(index, 'gender', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input type="date" value={contact.birthday || ''} onChange={(e) => handleInputChange(index, 'birthday', e.target.value)} /></TableCell>
                  <TableCell><Input type="date" value={contact.anniversary || ''} onChange={(e) => handleInputChange(index, 'anniversary', e.target.value)} /></TableCell>
                  {(mode !== 'edit') && <TableCell><div className="flex items-center gap-2" title={contact.message}>{getStatusIcon(contact.status)} <span className="text-xs text-muted-foreground truncate">{contact.message}</span></div></TableCell>}
                  {(mode !== 'csv') && <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => removeContact(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="pt-4 flex flex-wrap gap-2">
          {(mode === 'ocr' || mode === 'edit') && 
            <Button variant="outline" onClick={addContact}><PlusCircle className="mr-2 h-4 w-4" /> Add Contact</Button>
          }
          {hasDuplicates && 
            <Button variant="outline" onClick={handleRemoveDuplicates} className="text-yellow-600 border-yellow-300 hover:bg-yellow-50">Remove Duplicates</Button>
          }
          {hasInvalids && 
            <Button variant="outline" onClick={handleRemoveInvalids} className="text-red-600 border-red-300 hover:bg-red-50">Remove Invalid Rows</Button>
          }
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveClick}>
            {mode === 'csv' ? 'Save Selected Contacts' : 'Save Contacts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
