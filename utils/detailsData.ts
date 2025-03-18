export const details = [
    // Authentication Pages
    {
        title: "Sign in Page",
        description: "Users can access their accounts by providing the correct email and password. Limited to authorized users.",
        featuredImage: "/sign-in.png",
        list_of_features: [
            "No sign up system",
            "Correct Email Password",
            "Next-Auth",
            "Protected Pages"
        ],
        accessRole: ["Public"],
        flexReverse: true
    },
    // Dashboard Pages

    {
        title: "Admin Dashboard Page",
        description: "Admin can see various statistics and graphs related to user activity, attendance, and fees.",
        featuredImage: "/admin-dashboard.png",
        list_of_features: [
            "Total Users",
            "Total Trainers",
            "Total Students",
            "Online Users",
            "Paid Fees",
            "Unpaid Fees",
            "Activity Status",
            "Attendance Graph",
            "Protected Page"
        ],
        accessRole: ["Admin"],
        flexReverse: false
    },
    {
        title: "Trainer Dashboard Page",
        description: "Trainers can view statistics and graphs related to user activity and attendance.",
        featuredImage: "/trainer-dashboard.png",
        list_of_features: [
            "Total Users",
            "Total Trainers",
            "Total Students",
            "Online Users",
            "Activity Status",
            "Attendance Graph",
            "Protected Page"
        ],
        accessRole: ["Trainer"],
        flexReverse: true
    },
    {
        title: "Student Dashboard Page",
        description: "Students can view their fees status, attendance graph, and activity status.",
        featuredImage: "/student-dashboard.png",
        list_of_features:
            [
                "Fees Status",
                "Activity Status",
                "Attendance Graph",
                "Protected Page"
            ],
        accessRole: ["Student"],
        flexReverse: false
    },
    // User Profile Pages
    {
        title: "Profile Page",
        description: "Users can view and update their profile details, including images and personal information.",
        featuredImage: "/profile.png",
        list_of_features: [
            "View all details",
            "Update Profile Image",
            "Update Personal Data",
            "Change Password",
            "Cannot change email, gender, or user role"
        ],
        accessRole: ["Logged-in User"],
        flexReverse: false
    },
    {
        title: "Trainer Page",
        description: "Admins, trainers and students can view detailed information about trainers.",
        featuredImage: "/trainer.png",
        list_of_features: [
            "User can see the trainer's details",
            "Trainer's All Data",
            "Trainer's Image",
            "Server Page",
            "Protected Page"
        ],
        accessRole: ["Admin", "Trainer", "Student"],
        flexReverse: false
    },
    {
        title: "Student Page",
        description: "Admins and trainers can view detailed information about students.",
        featuredImage: "/student.png",
        list_of_features: [
            "User can see the student's details",
            "Student's All Data",
            "Student's Image",
            "Server Page",
            "Protected Page"
        ],
        accessRole: ["Admin", "Trainer"],
        flexReverse: false
    },
    // User Management Pages
    {
        title: "Add Member Page",
        description: "Admins can add both trainers and students, while trainers can only add students.",
        featuredImage: "/add-member.png",
        list_of_features: [
            "Admin add trainer & students",
            "Trainer can add only students",
            "Image Upload to cloudinary",
            "User Name, Email, Password",
            "Age, Weight, Height",
            "User Goal, User Level"
        ],
        accessRole: ["Admin", "Trainer"],
        flexReverse: true
    },
    {
        title: "Manage User Page",
        description: "Admin can view, update, and delete user profiles and also can assign trainers to students.",
        featuredImage: "/manage-user.png",
        list_of_features: [
            "See All Users",
            "Delete User",
            "Update User",
            "Assign Trainer to the students",
            "Protected Page"
        ],
        accessRole: ["Admin"],
        flexReverse: false
    },
    // Trainers and Students Pages
    {
        title: "Trainers page",
        description: "Admins, trainers, and students can view a list of trainers with pagination support.",
        featuredImage: '/trainers.png',
        list_of_features: [
            'Visible by Admin, Trainers, Students',
            "Table View List of trainers",
            "Pagination",
            "Protected Page"
        ],
        accessRole: ["Admin", "Trainer", "Student"],
        flexReverse: true,
    },
    {
        title: "Students page",
        description: "Admins and trainers can view a list of students with pagination support.",
        featuredImage: '/students.png',
        list_of_features: [
            'Visible by Admin, Trainers.',
            "Table View List of trainers",
            "Pagination",
            "Protected Page"
        ],
        accessRole: ["Admin", "Trainer"],
        flexReverse: true,
    },
    // Attendance Pages
    {
        title: "Attendance Page",
        description: "Admins and trainers can create and monitor student attendance.",
        featuredImage: '/attendance.png',
        list_of_features: [
            "Create attendance",
            "Monitor attendance",
            "Table view all attendance"
        ],
        accessRole: ["Admin", "Trainer"],
        flexReverse: false,
    },
    {
        title: "Student Attendance Page",
        description: "Students can view their attendance and mark their daily attendance.",
        featuredImage: "/student-attendance.png",
        list_of_features: [
            "See Attendance",
            "Mark Attendance",
            "Late attendance is not allowed",
            "Protected Page"
        ],
        accessRole: ["Student"],
        flexReverse: true
    },
    // Exercise and Diet Pages
    {
        title: "Manage Exercise Page",
        description: "Admins and trainers can manage exercises, including adding, viewing, and deleting.",
        featuredImage: "/manage-exercise.png",
        list_of_features: [
            "Add Exercise",
            "See All Exercises",
            "Delete Exercise",
            "Protected Page"
        ],
        accessRole: ["Admin", "Trainer"],
        flexReverse: false
    }, {
        title: "Assign Exercise Page",
        description: "Admins and trainers can assign exercises to students with details like time period and sets.",
        featuredImage: "/assign-exercise.png",
        list_of_features: [
            "Select users",
            "Assign Exercise to users",
            "Update Exercise to users",
            "Add Time",
            "From Date and To Date",
            "Add Sets, Steps, kg, Rest time for each exercise",
            "Send Notification",
            "Protected Page"
        ],
        accessRole: ["Admin", "Trainer"],
        flexReverse: true
    },
    {
        title: "Manage (Diet) Food Page",
        description: "Admins and trainers can manage foods, including adding, viewing, and deleting.",
        featuredImage: "/manage-diet-food.png",
        list_of_features: [
            "Add food",
            "See All foods",
            "Delete food",
            "Protected Page"
        ],
        accessRole: ["Admin", "Trainer"],
        flexReverse: false
    },
    {
        title: "Assign Diet Sheet Page",
        description: "Admins and trainers can assign diet sheets to students with details like time period and meals.",
        featuredImage: "/assign-diet-sheet.png",
        list_of_features: [
            "Select users",
            "Assign diet sheet to users",
            "Update diet sheet to users",
            "Add Time",
            "From Date and To Date",
            "Check mark the food for Morning, Mid Morning, Lunch, Evening Snack, Dinner",
            "Send Notification",
            "Protected Page"
        ],
        accessRole: ["Admin", "Trainer"],
        flexReverse: true
    },
    {
        title: "Student Exercise Page",
        description: "Students can view their exercise routines, including a table displaying exercises, time periods, sets, steps, kg, and rest time for each exercise.",
        featuredImage: "/student-exercise.png",
        list_of_features: [
            "View Exercise Routines",
            "See Time Periods",
            "See Sets, Steps, kg, and Rest Time for Each Exercise",
            "Protected Page"
        ],
        accessRole: ["Student"],
        flexReverse: false
    },
    {
        title: "Student Diet Sheet Page",
        description: "Students can access their diet sheets, including a table showing meals and food items for Morning, Mid Morning, Lunch, Evening Snack, and Dinner, along with time periods.",
        featuredImage: "/student-diet-sheet.png",
        list_of_features: [
            "Access Diet Sheets",
            "See Time Periods",
            "See Food for Different Meals",
            "Protected Page"
        ],
        accessRole: ["Student"],
        flexReverse: true
    },
    // Fees Pages
    {
        title: "Fees Page",
        description: "Admins and trainers can add, track, and send reminders for student fees.",
        featuredImage: "/fees-admin-trainer.png",
        list_of_features: [
            "Add Fees",
            "Send Notification for Fees",
            "Track Fees Status",
            "Send Reminder for unpaid fees",
            "Protected Page"
        ],
        accessRole: ["Admin", "Trainer"],
        flexReverse: true
    },
    {
        title: "Student Fees Page",
        description: "Students can view their fees status, pay fees, and see fees history.",
        featuredImage: "/student-fees.png",
        list_of_features: [
            "See Fees Status",
            "Pay Fees",
            "See Fees History",
            "Protected Page"
        ],
        accessRole: ["Student"],
        flexReverse: false
    },
    {
        title: "Student Fees Stripe Checkout Page",
        description: "Students can conveniently pay fees using Stripe checkout with various card options.",
        featuredImage: "/student-fees-stripe-checkout.png",
        list_of_features: [
            "Pay Fees via Stripe checkout",
            "Supports credit cards, debit cards, master cards, visa cards",
            "Protected Page"
        ],
        accessRole: ["Student"],
        flexReverse: true
    },
    {
        title: "Student Payment Success Page",
        description: "After making a fee payment, students will see a payment success page displaying payment details, billing information, payment method, and total amount.",
        featuredImage: "/student-payment-success.png",
        list_of_features: [
            "View Payment Details",
            "See Billing Information",
            "Check Payment Method",
            "View Total Amount",
            "Download Receipt",
            "Protected Page"
        ],
        accessRole: ["Student"],
        flexReverse: false
    },
    {
        title: "Notification Page",
        description: "Users can send, view, and manage notifications. They can mark notifications as read, see the sender, and click on notifications to navigate to relevant pages.",
        featuredImage: "/notification.png",
        list_of_features: [
            "Send Notifications",
            "View Notifications",
            "Mark Notifications as Read",
            "See Sender Information",
            "Navigate to Relevant Pages from Notifications",
            "Protected Page"
        ],
        accessRole: ["Admin", "Trainer", "Student"],
        flexReverse: true
    },
]