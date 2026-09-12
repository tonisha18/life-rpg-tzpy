if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const app = express();

if (!process.env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL is not configured");
}

if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_ANON_KEY is not configured");
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
    res.render("index.ejs");
});


app.get("/login", (req, res) => {
    res.render("login.ejs");
});


app.get("/register", (req, res) => {
    res.render("register.ejs");
});

async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Authentication Required"
            });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                error: "Authentication Token Missing"
            });
        }
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
            return res.status(401).json({
                error: "Invalid or Expired Token"
            });
        }
        req.user = data.user;
        next();
    } catch (error) {
        console.error("Authentication Error:", error);

        return res.status(500).json({
            error: "Authentication Failed"
        });
    }
}

app.get("/api/me", authenticateUser, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email
        }
    });
});

app.use((err, req, res, next) => {
    console.error("Internal Server Error:", err);

    res.status(500).json({
        error: "Internal Server Error"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
