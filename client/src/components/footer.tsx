import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
    return (
        <footer className="bg-primary text-primary-foreground pt-12 pb-6">
            <div className="container mx-auto max-w-7xl px-6">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <h3 className="text-xl font-bold mb-4">ChargeSpot</h3>
                        <p className="text-primary-foreground/80 text-sm">
                            Empowering the future of mobility with smart, reliable, and accessible EV charging solutions.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-sm text-primary-foreground/80">
                            <li><Link href="/" className="hover:text-white">Home</Link></li>
                            <li><Link href="/stations" className="hover:text-white">Find Stations</Link></li>
                            <li><Link href="/how-it-works" className="hover:text-white">How It Works</Link></li>
                            <li><Link href="/login" className="hover:text-white">Login / Register</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Contact Us</h4>
                        <ul className="space-y-2 text-sm text-primary-foreground/80">
                            <li className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>123 Tech Park, Bangalore, India</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>+91 98765 43210</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>support@chargespot.com</span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Follow Us</h4>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-white transition-colors"><Facebook className="h-5 w-5" /></a>
                            <a href="#" className="hover:text-white transition-colors"><Twitter className="h-5 w-5" /></a>
                            <a href="#" className="hover:text-white transition-colors"><Instagram className="h-5 w-5" /></a>
                            <a href="#" className="hover:text-white transition-colors"><Linkedin className="h-5 w-5" /></a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-primary-foreground/20 pt-6 text-center text-sm text-primary-foreground/60">
                    <p>&copy; {new Date().getFullYear()} ChargeSpot. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
