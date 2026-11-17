import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        // Navigation link classes - ensure these are always included
        'bg-resdes-orange',
        'text-slate-950',
        'hover:bg-resdes-orange',
        'hover:opacity-[.8]',
        'hover:text-slate-950',
        'transition-opacity',
        'transition-colors',
        'duration-300',
        // Button classes
        'btn',
        'btn-ghost',
        'px-3',
        'py-3',
        'font-semibold',
        'text-sm',
        // Additional utility classes
        'w-full',
        'justify-start',
        // All resdes colors to ensure they're available
        'bg-resdes-blue',
        'bg-resdes-teal',
        'bg-resdes-green',
        'bg-resdes-red',
        'bg-resdes-yellow',
        'bg-resdes-purple',
        'text-resdes-orange',
        'text-resdes-blue',
        'text-resdes-teal',
        'text-resdes-green',
        'text-resdes-red',
        'text-resdes-yellow',
        'text-resdes-purple'
    ],
    theme: {
        extend: {
            colors: {
                "resdes-orange": "#df6d20",
                "resdes-blue": "#2092df",
                "resdes-teal": "#20dfcd",
                "resdes-green": "#20df6d",
                "resdes-red": "#df2033",
                "resdes-yellow": "#dfcd20",
                "resdes-purple": "#6d20df"
            },
        },
    },
    plugins: [daisyui],
    daisyui: {
        themes: ["dim", "lofi"],
    },
}