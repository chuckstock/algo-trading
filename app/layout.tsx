import type { Metadata } from "next";
import {
	IBM_Plex_Mono,
	Libre_Baskerville,
	Source_Sans_3,
} from "next/font/google";
import "./globals.css";

const editorialSerif = Libre_Baskerville({
	variable: "--font-editorial-serif",
	subsets: ["latin"],
	weight: ["400", "700"],
});

const editorialSans = Source_Sans_3({
	variable: "--font-editorial-sans",
	subsets: ["latin"],
});

const editorialMono = IBM_Plex_Mono({
	variable: "--font-editorial-mono",
	subsets: ["latin"],
	weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
	title: "Algo Trading Desk",
	description: "Editorial dashboard for monitoring symbol-specific SMA trading signals.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${editorialSerif.variable} ${editorialSans.variable} ${editorialMono.variable} antialiased`}
			>
				{children}
			</body>
		</html>
	);
}
