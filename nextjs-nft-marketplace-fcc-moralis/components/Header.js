import { ConnectButton } from "web3uikit";
import Link from "next/link";

export default function Header() {
    return (
        <nav className="p-5 border-b-2 flex flex-row justify-between items-center">
            {/* <Link href="/">NFT Marketplace</Link> */}
            <h1 className="py-4 px-4 font-bold text-3xl">NFT Marketplace</h1>
            <div className="flex flex-row items-center">
                <Link href="/" className="mr-4 p-6">
                    Home
                </Link>
                <Link href="/sell-nft" className="mr-4 p-6">
                    Sell NFT
                </Link>
                {/* keep this to false so that we don't automatically connect to a moralis database */}
                <ConnectButton moralisAuth={false} />
            </div>
        </nav>
    );
}
