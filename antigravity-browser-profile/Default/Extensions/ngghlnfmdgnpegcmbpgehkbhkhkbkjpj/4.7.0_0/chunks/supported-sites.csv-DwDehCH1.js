import{U as o}from"./lodash-BLsAxiRH.js";import"./storage-BF__RA11.js";const n=(a,m=!1)=>{const c=a.trim().split(/\r\n|\r|\n/),i=o.head(c).split(","),s=o.map(o.tail(c),(e,t)=>{e=e.split(",").map(l=>l||null);const r=o.fromPairs(o.zip(i,e));return m&&(r.id=t+1),r});return s._rawCSV=a,s},f=n(`url_glob,service_slug,service_title,bg_color
*://docs.google.com/spreadsheets/**/*,google-sheets,Google Sheets,00a256
*://*.slack.com/**/*,slack,Slack,510f4d
*://mail.google.com/**/*,gmail,Gmail,db4437
*://calendar.google.com/**/*,google-calendar,Google Calendar,3680f7
*://trello.com/**,trello,Trello,0079bf
*://*.mailchimp.com/**,mailchimp,Mailchimp,FFE01B
*://*.salesforce.com/**/*,salesforce,Salesforce,1798c1
*://*.lightning.force.com/**/*,salesforce,Salesforce,1798c1
*://airtable.com/tbl*/**/*,airtable,Airtable,FF505D
*://app.hubspot.com/**,hubspot,Hubspot,f7761f
*://drive.google.com/drive/**/*,google-drive,Google Drive,f4b400
*://docs.google.com/forms/**/*,google-forms,Google Forms,673AB1
*://*.myshopify.com/admin,shopify,Shopify,96bf48
*://*.myshopify.com/admin/**,shopify,Shopify,96bf48
*://*my.sharepoint.com/**/*,office-365,Office 365,ea3e23
*://*.facebook.com/*/ad_center**,facebook-lead-ads,Facebook Lead Ads,1878f3
*://*.qbo.intuit.com/**/*,quickbooks,Quickbooks,24a205
*://www.facebook.com/adsmanager/**/*,instagram,Instagram,000000
*://onedrive.live.com/**,excel,Excel,207245
*://discord.com/channels/**,discord,Discord,5865f2
*://woocommerce.com/**,woocommerce,WooCommerce,9b5c8f
*://app.asana.com/**/*,asana,Asana,2e3c54
*://*.facebook.com/*/inbox/**,facebook-pages,Facebook Pages,1878F3
*://*.pipedrive.com/**/*,pipedrive,Pipedrive,414143
*://*.atlassian.net/**/*,jira,Jira,205081
*://www.paypal.com/**,paypal,PayPal,005ea6
*://*.activehosted.com/admin/**/*,activecampaign,ActiveCampaign,3463a3
*://*.monday.com/**,monday,Monday,FAB715
*://dashboard.stripe.com/**/*,stripe,Stripe,00afe1
*://www.linkedin.com/**/*,linkedin,LinkedIn,0077b5
*://twitter.com/**/*,twitter,Twitter,2DAAE1
*://crm.zoho.com/**/*,zoho-crm,Zoho CRM,ef463e
*://go.xero.com/**/*,xero,Xero,00b7e3
*://www.dropbox.com/**/*,dropbox,Dropbox,2964f6
*://zoom.us/**/*,zoom,Zoom,348FFB
*://admin.typeform.com/**/*,typeform,Typeform,8bcbca
*://docs.google.com/document/**/*,google-docs,Google Docs,4f8df5
*://calendly.com/**/*,calendly,Calendly,666A73
*://*.clickfunnels.com/**/*,clickfunnels,Clickfunnels,3c9cd6
*://manychat.com/**/*,manychat,Manychat,0084FF
*://app.hubspot.com/**,hubspot-crm,Crm,ED652A
*://todoist.com/app/**/*,todoist,Todoist,df4a32
*://www.onedrive.live.com/**,onenote,Onenote,7e3878
*://www.evernote.com/client/**/*,evernote,Evernote,6fb536
*://coda.io/**,coda,Coda,ee5a2a
*://app.docusign.com/**,docusign,DocuSign,194ba0
*://todo.microsoft.com/**,microsoft-todo,Microsoft To-Do,44a9ef
*://*.notion.so/**,notion,Notion,000000
*://*.zendesk.com/**,zendesk,Zendesk,78a300
*://wordpress.com/**,wordpress,WordPress,21759b
*://*.squarespace.com/**,squarespace,Squarespace,000000
*://webflow.com/**,webflow,Webflow,7257b4
*://www.instagram.com/**,instagram-for-business,Instagram for Business,000000
*://*pinterest.*/**,pinterest,Pinterest,BB232C
*://zapier.com/**,zapier-manager,Zapier Manager,FF4A00
*://ads.google.com/**,google-ads,google-ads,4285F4
*://sellercentral.amazon.*/**,amazon-seller-central,Amazon Seller Central,F8981D
*://teams.microsoft.com/**,microsoft-teams,Microsoft Teams,5558AF
*://squareup.com/dashboard/**,square,Square,000000`,!0);export{f as default};
