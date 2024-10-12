/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{html,ts}"],
    theme: {
        extend: {
            animation: {
                "toast-progress": "toast-progress 4.5s 0.3s linear",
            },
            keyframes: {
                "toast-progress": {
                    from: {
                        opacity: 0,
                        transform: "scaleX(0)",
                    },
                    to: {
                        opacity: 1,
                        transform: "scaleX(1)",
                    },
                },
            },
        },
    },
    plugins: [],
};
