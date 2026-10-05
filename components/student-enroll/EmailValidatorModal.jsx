"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


export function EmailValidatorModal({ open, onOpenChange, email, onContinue, onChangeEmail }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="-mx-4 -mt-4 border-b p-4">
          <DialogTitle className="text-xl">Information</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-4">
          <Image
            src="/images/valid-email.png"
            alt=""
            width={120}
            height={120}
            unoptimized
            className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28"
          />
          <p className="text-sm text-slate-700 sm:text-base">
            The email <span className="font-semibold text-primary">{email}</span> appears to be invalid.
            <br />
            Do you want to continue with it? 
          </p>
        </div>
        <DialogFooter className="sm:justify-center">
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={onContinue} className="bg-primary hover:bg-primary/90">
              Yes
            </Button>
            <Button type="button" variant="outline" onClick={onChangeEmail}>
              I want to change student email
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
