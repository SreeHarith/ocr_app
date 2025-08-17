"use client"

import { useEffect, useState } from "react"
import React from "react" // Import React for Fragments
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Trash2, PlusCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js"

interface ContactInfo {
  name: string;
  phone: string;
  gender: string;
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

const DEFAULT_COUNTRY: CountryCode = "IN";
type AcceptType = string;
const ACCEPT_TYPE: AcceptType = "any";

const normalizeAndParse = (raw: string, country?: CountryCode) => {
  const input = raw?.trim() ?? "";
  if (!input) return { parsed: null as ReturnType<typeof parsePhoneNumberFromString> | null, normalized: "" };
  const parsedIntl = parsePhoneNumberFromString(input);
  if (parsedIntl) return { parsed: parsedIntl, normalized: parsedIntl.number };
  const parsedWithCountry = parsePhoneNumberFromString(input, country || DEFAULT_COUNTRY);
  if (parsedWithCountry) return { parsed: parsedWithCountry, normalized: parsedWithCountry.number };
  const justDigitsPlus = input.replace(/[^\d+]/g, "");
  const retryIntl = parsePhoneNumberFromString(justDigitsPlus);
  if (retryIntl) return { parsed: retryIntl, normalized: retryIntl.number };
  const retryCountry = parsePhoneNumberFromString(justDigitsPlus, country || DEFAULT_COUNTRY);
  if (retryCountry) return { parsed: retryCountry, normalized: retryCountry.number };
  return { parsed: null, normalized: "" };
};

// ================== UPDATED VALIDATION FUNCTION ==================
const getValidationError = (raw: string, country?: CountryCode): string | null => {
  if (!raw || !raw.trim()) return null;

  const { parsed } = normalizeAndParse(raw, country);

  if (!parsed) {
    return "Invalid phone number format";
  }

  // 1. General validation by the library
  if (!parsed.isValid()) {
    return "Invalid phone number";
  }

  // 2. Stricter custom rule for India
  if (parsed.country === 'IN') {
    const nationalNumber = parsed.nationalNumber;
    // Valid Indian numbers must be 10 digits and start with 6, 7, 8, or 9.
    if (!/^[6789]\d{9}$/.test(nationalNumber)) {
      return "Invalid Indian number";
    }
  }

  // 3. Mobile-only check (if enabled)
  if (ACCEPT_TYPE === "mobile") {
    const t: string | undefined = parsed.getType?.();
    if (t && t !== "MOBILE" && t !== "FIXED_LINE_OR_MOBILE") {
      return "Must be a mobile number";
    }
  }

  return null;
};
// =================================================================

const toE164 = (raw: string, country?: CountryCode): string => {
  const { parsed } = normalizeAndParse(raw, country);
  return parsed?.number ?? (raw?.trim() ?? "");
};

export default function EditDialog({ isOpen, setIsOpen, data, onSave }: EditDialogProps) {
  const [editedData, setEditedData] = useState<ContactInfo[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (data) {
      setEditedData(data);
      validateAllPhones(data);
    }
  }, [data]);

  const validatePhone = (phone: string, index: number, country?: CountryCode) => {
    const error = getValidationError(phone, country);
    if (error) {
      setValidationErrors(prev => ({ ...prev, [index]: error }));
    } else {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const validateAllPhones = (contacts: ContactInfo[]) => {
    const errors: Record<number, string> = {};
    contacts.forEach((contact, index) => {
      const error = getValidationError(contact.phone);
      if (error) errors[index] = error;
    });
    setValidationErrors(errors);
  };

  const handleInputChange = (index: number, field: 'name' | 'phone' | 'gender', value: string) => {
    const updated = [...editedData];
    // @ts-ignore
    updated[index][field] = value;
    setEditedData(updated);
    if (field === 'phone') {
      validatePhone(value, index);
    }
  };

  const removeContact = (index: number) => {
    const next = editedData.filter((_, i) => i !== index);
    setEditedData(next);
    validateAllPhones(next);
  };

  const addContact = () => {
    setEditedData([
      ...editedData,
      { name: "", phone: "", gender: "unknown" },
    ]);
  };

  const getDuplicateInfo = (currentIndex: number): DuplicateInfo => {
    const currentContact = editedData[currentIndex];
    const currentPhone = currentContact.phone.trim();
    if (!currentPhone) return { isDuplicate: false, originalIndex: null };
    const currentE164 = toE164(currentPhone);
    for (let i = 0; i < currentIndex; i++) {
      const prevContact = editedData[i];
      const prevE164 = toE164(prevContact.phone);
      if (prevE164 && currentE164 && prevE164 === currentE164) {
        return { isDuplicate: true, originalIndex: i };
      }
    }
    return { isDuplicate: false, originalIndex: null };
  };

  const handleSaveClick = () => {
    if (Object.keys(validationErrors).length > 0) {
      alert("Please fix the invalid phone numbers before saving.");
      return;
    }
    const hasDuplicates = editedData.some((_, index) => getDuplicateInfo(index).isDuplicate);
    if (hasDuplicates) {
      if (!confirm("Duplicate phone numbers were found. Are you sure you want to save?")) {
        return;
      }
    }
    const finalData = editedData
      .map(c => ({
        ...c,
        phone: toE164(c.phone),
      }))
      .filter(contact => contact.name.trim() !== "" || contact.phone.trim() !== "");
    onSave(finalData);
  };

  const handleDeleteDuplicates = () => {
    const nonDuplicates = editedData.filter((_, index) => !getDuplicateInfo(index).isDuplicate);
    setEditedData(nonDuplicates);
    validateAllPhones(nonDuplicates);
  };

  const hasDuplicates = editedData.some((_, index) => getDuplicateInfo(index).isDuplicate);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl">
        <TooltipProvider>
          <DialogHeader>
            <DialogTitle>Verify Information</DialogTitle>
            <DialogDescription>
              Review and edit contacts. The AI has predicted the gender.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedData.map((contact, index) => {
                  const duplicateInfo = getDuplicateInfo(index);
                  const isInvalid = !!validationErrors[index];
                  const highlightClass = duplicateInfo.isDuplicate
                    ? "bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/60"
                    : "";
                  const tableRow = (
                      <TableRow className={cn("transition-colors", highlightClass)}>
                        <TableCell>
                          <Input
                            value={contact.name}
                            onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                            placeholder="Enter name..."
                            className="bg-transparent"
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            value={contact.phone}
                            onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                            placeholder="e.g., +44 7700 900123"
                            className={cn(
                              "bg-transparent",
                              isInvalid && "border-red-500 text-red-900 focus-visible:ring-red-500"
                            )}
                          />
                          {isInvalid && (
                            <p className="text-xs text-red-600 mt-1 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                              {validationErrors[index]}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={contact.gender}
                            onValueChange={(value) => handleInputChange(index, 'gender', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeContact(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                  );

                  return (
                    <React.Fragment key={index}>
                      {duplicateInfo.isDuplicate ? (
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>{tableRow}</TooltipTrigger>
                          <TooltipContent>
                            <p>Duplicate of row #{duplicateInfo.originalIndex! + 1} ({editedData[duplicateInfo.originalIndex!].name})</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        tableRow
                      )}
                    </React.Fragment>
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