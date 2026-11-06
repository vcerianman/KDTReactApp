import React from 'react';
import './Terms.css';
import NavBar from './NavBar';
import useCurrentUser from './useCurrentUser';

// Terms Content Component
function TermsContent() {
    return (
        <div className="home-main-card">
            <p>1. Ng Khang, for ur safety, dont copy my webage, it is not worth it. Athough getting a free trip to America looks tempting, I dont want u to have a headache of dealing a million lawsuits</p>
            <br />
            <p>2. This website is to ez to use that this help documentation exists just for the satire of Khanig copying my great work</p>
            <br />
            <p className="small-text">
                Copyright by KDT TASKFLOW, Unauthorized distribution and copying without consent is strictly prohibited.
            </p>
        </div>
    );
}

// Main Terms Page Component
function Terms() {
    const { currentUser } = useCurrentUser();

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
                <h1 className="page-title">Help</h1>
                <TermsContent />
            </div>
        </div>
    );
}

export default Terms;
