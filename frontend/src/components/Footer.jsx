/*
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
/**
 * Footer component with copyright information and company link
 * @returns {JSX.Element} The footer component
 */
const Footer = () => {
    return (
        <footer className="sticky bottom-0 bg-base-300 border-t-2 border-resdes-orange">
            <div className="mx-auto max-w-screen-xl p-2 text-center">Copyright 2025 <a href="https://resonancedesigns.dev" className="text-resdes-teal hover:underline" target="_blank">Resonance Designs</a></div>
        </footer>
    );
}
export default Footer;
