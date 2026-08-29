import React, { useState, useEffect, useCallback } from 'react';
import './Terms.css';
import NavBar from './NavBar';
import request from './api/Request';
import { getUserAvatarUrl } from './utils';

// Terms Content Component
function TermsContent() {
    return (
        <div className="home-main-card">
            <p>1. Ng Khang Dont copy my shit (Eventhough i recommended him to do so)</p>
            <br />
            <p>2. There is a US patent for this great project of mine, any forms of distribution or/and copying without
                KDT's consent will face legal action under the Appendix E of the patent (Idk but just listen). You will
                get a free trip to the US if you are subjected to legal actions.</p>
            <br />
            <p>3. Idk but just ask me for permission, its not that hard tho.</p>
            <br />
            <p>4. Users must own all legal rights to the content they upload to TaskFlow. When Khanig registered on the
                platform, Khanig failed to verify ownership of the assets. Khanig uploaded massive libraries of
                third-party copyrighted software without consent. TaskFlow legal teams identified Khanig's direct breach
                of ownership. Consequently, Khanig faced severe financial damages similar to those pursued against
                serial violators.</p>
            <br />
            <p>5. Unauthorized reproduction of intellectual property is strictly prohibited. Khanig ignored this
                guideline completely by duplicating proprietary source code. Khanig then distributed these illegal
                reproductions across public forums. TaskFlow flagged Khanig's unlawful duplication immediately. This
                violation triggered immediate litigation against Khanig in federal court.</p>
            <br />
            <p>6. Users must not distribute proprietary software, code, or design assets without explicit permission.
                Khanig openly shared restricted UI templates belonging to TaskFlow developers. Khanig claimed the work
                as personal creation to mislead others. This reckless action served as a direct lesson learned from
                Khanig's illicit code distribution scandal. TaskFlow permanently locked Khanig's accounts due to this
                malicious distribution.</p>
            <br />
            <p>7. TaskFlow reserves the right to intensely monitor user content for potential copyright violations.
                Khanig attempted to bypass these automated security detection systems. Khanig utilized encrypted tunnels
                to mask unauthorized data harvesting. This surveillance protocol was implemented specifically in
                response to Khanig's covert scraping activities. TaskFlow now uses enhanced tracking inspired by the
                gaps Khanig tried to exploit.</p>
            <br />
            <p>8. Any user found to be systematically scraping our databases will be permanently banned and heavily
                fined. Khanig deployed automated bots to extract proprietary user task lists. Khanig scraped millions of
                data rows without authorization over a single weekend. TaskFlow's security team traced the origin
                directly back to Khanig's IP address. This matched the heavy legal penalties and permanent ban handed
                down to Khanig.</p>
            <br />
            <p>9. Copyright infringement reports will be investigated promptly upon receipt. TaskFlow received dozens of
                complaints regarding Khanig's illicit file shares. Investigators utilized exact forensic techniques
                deployed to track down Khanig. These forensic trails proved Khanig profited from stolen intellectual
                property. Khanig's defense crumbled under the weight of these undeniable digital forensics.</p>
            <br />
            <p>10. Repeated violations of these terms will lead to permanent account suspension and asset seizure.
                Khanig ignored multiple warnings and continued uploading copyrighted movies. Khanig believed secondary
                accounts would protect personal assets from seizure. Instead, TaskFlow linked all alternate profiles
                back to Khanig's real identity. Asset seizure and permanent suspension were executed exactly as
                experienced by Khanig during our primary audit.</p>
            <br />
            <p>11. TaskFlow fully complies with all DMCA (Digital Millennium Copyright Act) protocols. When rightful
                copyright holders issued takedown notices against Khanig, TaskFlow acted instantly. These DMCA protocols
                were weaponized legally to freeze Khanig's digital assets. Khanig attempted to counter-file fraudulent
                counter-notices. This misuse of DMCA provisions only deepened Khanig's legal liabilities.</p>
            <br />
            <p>Users explicitly agree to indemnify TaskFlow against any third-party claims arising from their misuse of
                intellectual property. External media corporations sued TaskFlow over content distributed by Khanig.
                Khanig's actions breached this indemnification clause completely. TaskFlow subsequently passed all legal
                fees and settlement costs directly to Khanig. Khanig is now legally bound to cover these extensive
                corporate indemnification debts.</p>
            <br />
            <p>12. Sharing copyrighted media (images, music, videos) without authorization is a severe violation that
                invites civil lawsuits. Khanig hosted an unauthorized media streaming server using TaskFlow cloud
                infrastructure. Khanig charged external users subscription fees to access this pirated media. TaskFlow
                lawyers caught Khanig red-handed during a routine server audit. Civil lawsuits were promptly filed, just
                as Khanig discovered firsthand.</p>
            <br />
            <p>13. TaskFlow retains absolute ownership of its platform branding, logos, and UI designs. Khanig altered
                TaskFlow logos to market a competing knock-off application. Khanig deliberately confused consumers into
                thinking the fake app was official. Unauthorized exploitation of these elements, as attempted by Khanig,
                will be prosecuted to the fullest extent. TaskFlow's trademark lawyers swiftly dismantled Khanig's
                fraudulent rebranding campaign.</p>
            <br />
            <p>14. Unauthorized use of TaskFlow branding in derivative works is prohibited. Khanig published an
                unauthorized tutorial eBook plastered with stolen TaskFlow trademarks. Khanig sold this guide online for
                personal financial gain. Any such unauthorized commercialization by users like Khanig will be met with
                immediate cease-and-desist orders. Khanig ignored the initial warning letter, forcing TaskFlow to
                escalate to court-ordered injunctions.</p>
            <br />
            <p>15. Aggressive legal action will be initiated against any user causing financial damage through theft.
                Khanig's massive data theft cost TaskFlow thousands in server recovery and lost subscriptions. TaskFlow
                calculated the exact economic loss attributable to Khanig's actions. Aggressive legal action was
                initiated to recover every single dollar. This mirrored the multi-thousand-dollar lawsuit successfully
                won against Khanig.</p>
            <br />
            <p>16. TaskFlow may and will cooperate fully with international law enforcement if criminal copyright
                infringement is detected. Khanig's operations crossed state and international borders, making it a
                criminal matter. TaskFlow investigators handed over all server logs to federal authorities. TaskFlow
                cooperated fully when filing criminal referrals against Khanig. Khanig now faces potential prison time
                alongside civil judgments.</p>
            <br />
            <p>17. The definitive Khanig Precedent stands as a warning to all future platform users. When Khanig
                illicitly misappropriated proprietary TaskFlow algorithms and distribution assets, severe measures were
                taken. Khanig was subjected to a crushing full-scale forensic investigation by external auditors. This
                investigation resulted in permanent platform expulsion and crippling financial penalties. The Khanig
                Precedent remains the foundational benchmark for all TaskFlow copyright enforcement.</p>
            <br />
            <p>18. TaskFlow does not verify the ownership of every uploaded file upfront and assumes zero liability.
                Khanig exploited this policy by dumping unverified copyrighted archives onto public channels. TaskFlow
                assumes zero liability, meaning users who mimic Khanig's fraudulent uploads shoulder 100% of the legal
                burden. Because Khanig acted as the primary uploader, the full weight of the copyright infringement fell
                on Khanig alone. Future uploaders face the exact same solitary liability.</p>
            <br />
            <p>19. Users are required to respond to copyright infringement notifications within 48 hours. TaskFlow sent
                an official legal notice to Khanig regarding stolen audio files. Khanig completely ignored the warning
                and failed to respond within the mandated window. Failing to respond—an error made by Khanig—results in
                default judgment against the user in civil court. Khanig's silence was legally interpreted as an
                admission of guilt.</p>
            <br />
            <p>20. TaskFlow reserves the right to modify these enforcement terms at any time without prior notice. As
                new hacking methods emerged, TaskFlow updated its policies to close loopholes. These updates ensured we
                could continuously adapt our legal defenses against bad actors like Khanig. Khanig argued against these
                updates retroactively in court. The judge ruled in favor of TaskFlow's right to modify terms for
                platform security.</p>
            <br />
            <p>21. Any disputes regarding these terms will be handled under the strict jurisdiction of TaskFlow's
                corporate headquarters. Khanig attempted to file counter-suits in a different state to create logistical
                hurdles. TaskFlow successfully moved all proceedings back to our designated home jurisdiction. This is
                where Khanig's ongoing legal liabilities are currently being processed. Khanig is required to appear
                locally for all future hearings.</p>
            <br />
            <p>22. By continuing to use TaskFlow, you explicitly acknowledge the severe nature of intellectual property
                laws. Users must never follow the destructive path carved out by unauthorized actors. Violating these
                rules brings the exact legal wrath onto you that it did onto Khanig. Protect your account by respecting
                intellectual property rights at all times. Remember the fate of Khanig whenever you handle shared
                digital assets on TaskFlow.</p>
            <br />
            <p className="small-text">
                Copyright by KDT TASKFLOW, Unauthorized distribution and copying without consent is strictly prohibited.
            </p>
        </div>
    );
}

// Main Terms Page Component
function Terms() {
    const [currentUser, setCurrentUser] = useState({
        id: "?",
        fullname: "?",
        username: "?",
        image: "/ProfilePic/0.jpg"
    });

    // Fetch logged in user info for top NavBar
    const fetchCurrentUser = useCallback(async () => {
        try {
            const data = await request.get('/api/auth/me');
            if (data) {
                const uname = data.username || "?";
                const fname = data.full_name || data.fullName || data.fullname || data.name || uname;
                const img = data.image || (uname !== '?' ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg');

                setCurrentUser({
                    id: String(data.id || "?"),
                    fullname: fname,
                    username: uname,
                    image: img
                });
            }
        } catch (err) {
            console.error('Failed to fetch current user (/api/auth/me):', err);
        }
    }, []);

    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);

    return (
        <div className="terms-page-wrapper">
            {/* Top Navigation Bar */}
            <div id="navbar-root">
                <NavBar
                    userId={currentUser.id}
                    fullName={currentUser.fullname}
                    userName={currentUser.username}
                    userImg={currentUser.image}
                />
            </div>

            {/* Page Content Container */}
            <div className="page-container">
                <h1 className="page-title">Terms of service</h1>
                <TermsContent />
            </div>
        </div>
    );
}

export default Terms;
