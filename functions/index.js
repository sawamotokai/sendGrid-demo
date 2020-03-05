const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
	response.send('Hello from Firebase!');
});

const sgMail = require('@sendgrid/mail');

const API_KEY = functions.config().sendgrid.key;
const TEMPLATE_ID = functions.config().sendgrid.template;
sgMail.setApiKey(API_KEY);

// functions
exports.welcomeEmail = functions.auth.user().onCreate((user) => {
	const msg = {
		to: user.email,
		from: 'kai_demo@test.com',
		templateId: TEMPLATE_ID,
		dynamic_template_data: {
			subject: 'Welcome to my awesome app!',
			name: user.displayName
		}
	};

	return sgMail.send(msg);
});

exports.genericEmail = functions.https.onCall(async (data, context) => {
	if (!context.auth && !context.auth.token.email) {
		throw new functions.https.HttpsError('failed-precondition,', 'Must be logged with email');
	}

	const msg = {
		to: context.auth.token.email,
		from: 'kai_demo@test.com',
		templateId: TEMPLATE_ID,
		dynamic_template_data: {
			subject: data.subject,
			name: data.text
		}
	};

	await sgMail.send(msg);

	return { success: true };
});

exports.newComment = fucntions.firestore
	.document('posts/{postId}/comments/{commentId}')
	.onCreate(async (change, context) => {
		const postSnap = await db.collection('post').doc(context.params.postId).get();

		const post = postSnap.data();
		const comment = change.data();

		const msg = {
			to: post.authorEmail,
			from: 'kai_demo@test.com',
			templateId: TEMPLATE_ID,
			dynamic_template_data: {
				subject: `New comment on ${post.title}`,
				name: post.displayName,
				text: `${comment.user} said... ${comment.text}`
			}
		};
		return sgMail.send(msg);
	});

exports.weeklySummary = functions.pubsub.schedule('every friday 06:00').onRun(async (context) => {
	const userSnapshots = await admin.firestore().collection('user').get();

	const emails = userSnapshots.docs.map((s) => s.data().email);

	const msg = {
		to: emails,
		from: 'kai_demo@test.com',
		templateId: TEMPLATE_ID,
		dynamic_template_data: {
			subject: `Your weekly summary`,
			text: `Summary...`
		}
	};
});
