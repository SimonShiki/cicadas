import { ChangeEventHandler, FocusEventHandler, HTMLInputTypeAttribute } from "react";

interface InputProps {
    before?: React.ReactNode;
    after?: React.ReactNode;
    type?: HTMLInputTypeAttribute;
    placeholder?: string;
    default?: string;
    disabled?: boolean;
    value?: string | number;
    required?: boolean;
    autoComplete?: string;
    pattern?: string;
    onChange?: ChangeEventHandler<HTMLInputElement>;
    onBlur?: FocusEventHandler<HTMLInputElement>;
    onEnter?: () => void;
    size?: number;
    className?: string;
    inputClassName?: string;
}

export default function Input (props: InputProps) {
    return <div className={`flex items-center gap-3 px-3 h-fit color-text-sec dark:color-text-dark-sec border-(1 solid outline-pri) dark:border-outline-dark-pri rounded-1.5 bg-white border-b-(1 solid outline-ter) dark:bg-bg-dark-pri hover:bg-bg-pri dark:hover:bg-bg-dark-pri transition-colors has-[:focus]:!border-b-(1.5 fg-pri) ${props.className ?? ''}`}>
        {props.before}
        <input
            type={props.type}
            placeholder={props.placeholder}
            defaultValue={props.default}
            value={props.value}
            required={props.required}
            onChange={props.onChange}
            onBlur={props.onBlur}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    props.onEnter?.();
                }
            }}
            autoComplete={props.autoComplete}
            size={props.size}
            pattern={props.pattern}
            disabled={props.disabled}
            className={`font-inherit bg-transparent outline-none border-none appearance-none py-2 ${props.inputClassName ?? ''}`}
        />
        {props.after}
    </div>;
}
