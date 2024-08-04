import React, { ChangeEventHandler, FocusEventHandler } from "react";

interface TextareaProps {
    placeholder?: string;
    default?: string;
    disabled?: boolean;
    value?: string;
    required?: boolean;
    onChange?: ChangeEventHandler<HTMLTextAreaElement>;
    onBlur?: FocusEventHandler<HTMLTextAreaElement>;
    rows?: number;
    className?: string;
    textareaClassName?: string;
}

export default function Textarea (props: TextareaProps) {
    return (
        <div className={`flex items-start gap-4 px-2 color-text-sec dark:color-text-dark-sec border-(1 solid outline-pri) dark:border-outline-dark-pri rounded-1.5 bg-white has-[:disabled]:bg-bg-pri has-[:disabled]:hover:cursor-not-allowed dark:has-[:disabled]:bg-bg-dark-pri dark:bg-black transition-colors has-[:focus]:!border-fg-pri has-[:focus]:ring-(fg-pri op-20 3) ${props.className ?? ''}`}>
            <textarea
                placeholder={props.placeholder}
                defaultValue={props.default}
                value={props.value}
                required={props.required}
                onChange={props.onChange}
                onBlur={props.onBlur}
                rows={props.rows}
                disabled={props.disabled}
                className={`font-inherit disabled:hover:cursor-not-allowed resize-none w-full bg-transparent outline-none border-none appearance-none py-2 resize-y ${props.textareaClassName ?? ''}`}
            />
        </div>
    );
}
