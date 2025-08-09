import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
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