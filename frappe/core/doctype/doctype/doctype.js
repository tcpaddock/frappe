// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

// -------------
// Menu Display
// -------------

// $(cur_frm.wrapper).on("grid-row-render", function(e, grid_row) {
// 	if(grid_row.doc && grid_row.doc.fieldtype=="Section Break") {
// 		$(grid_row.row).css({"font-weight": "bold"});
// 	}
// })

frappe.ui.form.on('DocType', {
	refresh: function(frm) {
		frm.set_query('role', 'permissions', function(doc) {
			if (doc.custom && frappe.session.user != 'Administrator') {
				return {
					query: "frappe.core.doctype.role.role.role_query",
					filters: [['Role', 'name', '!=', 'All']]
				};
			}
		});

		if(frappe.session.user !== "Administrator" || !frappe.boot.developer_mode) {
			if(frm.is_new()) {
				frm.set_value("custom", 1);
			}
			frm.toggle_enable("custom", 0);
			frm.toggle_enable("is_virtual", 0);
			frm.toggle_enable("beta", 0);
		}

		if (!frm.is_new() && !frm.doc.istable) {
			if (frm.doc.issingle) {
				frm.add_custom_button(__('Go to {0}', [__(frm.doc.name)]), () => {
					window.open(`/app/${frappe.router.slug(frm.doc.name)}`);
				});
			} else {
				frm.add_custom_button(__('Go to {0} List', [__(frm.doc.name)]), () => {
					window.open(`/app/${frappe.router.slug(frm.doc.name)}`);
				});
			}
		}

		if(!frappe.boot.developer_mode && !frm.doc.custom) {
			// make the document read-only
			frm.set_read_only();
		}

		if(frm.is_new()) {
			if (!(frm.doc.permissions && frm.doc.permissions.length)) {
				frm.add_child('permissions', {role: 'System Manager'});
			}
		} else {
			frm.toggle_enable("engine", 0);
		}

		// set label for "In List View" for child tables
		frm.get_docfield('fields', 'in_list_view').label = frm.doc.istable ?
			__('In Grid View') : __('In List View');

		frm.events.autoname(frm);
	},

	autoname: function(frm) {
		frm.set_df_property('fields', 'reqd', frm.doc.autoname !== 'Prompt');
	}
});

frappe.ui.form.on("DocField", {
	form_render(frm, doctype, docname) {
		// Render two select fields for Fetch From instead of Small Text for better UX
		let field = frm.cur_grid.grid_form.fields_dict.fetch_from;
		$(field.input_area).hide();

		let $doctype_select = $(`<select class="form-control">`);
		let $field_select = $(`<select class="form-control">`);
		let $wrapper = $('<div class="fetch-from-select row"><div>');
		$wrapper.append($doctype_select, $field_select);
		field.$input_wrapper.append($wrapper);
		$doctype_select.wrap('<div class="col"></div>');
		$field_select.wrap('<div class="col"></div>');

		let row = frappe.get_doc(doctype, docname);
		let curr_value = { doctype: null, fieldname: null };
		if (row.fetch_from) {
			let [doctype, fieldname] = row.fetch_from.split(".");
			curr_value.doctype = doctype;
			curr_value.fieldname = fieldname;
		}
		let curr_df_link_doctype = row.fieldtype == "Link" ? row.options : null;

		let doctypes = frm.doc.fields
			.filter(df => df.fieldtype == "Link")
			.filter(df => df.options && df.options != curr_df_link_doctype)
			.map(df => ({
				label: `${df.options} (${df.fieldname})`,
				value: df.fieldname
			}));
		$doctype_select.add_options([
			{ label: __("Select DocType"), value: "", selected: true },
			...doctypes
		]);

		$doctype_select.on("change", () => {
			row.fetch_from = "";
			frm.dirty();
			update_fieldname_options();
		});

		function update_fieldname_options() {
			$field_select.find("option").remove();

			let link_fieldname = $doctype_select.val();
			if (!link_fieldname) return;
			let link_field = frm.doc.fields.find(
				df => df.fieldname === link_fieldname
			);
			let link_doctype = link_field.options;
			frappe.model.with_doctype(link_doctype, () => {
				let fields = frappe.meta
					.get_docfields(link_doctype, null, {
						fieldtype: ["not in", frappe.model.no_value_type]
					})
					.map(df => ({
						label: `${df.label} (${df.fieldtype})`,
						value: df.fieldname
					}));
				$field_select.add_options([
					{
						label: __("Select Field"),
						value: "",
						selected: true,
						disabled: true
					},
					...fields
				]);

				if (curr_value.fieldname) {
					$field_select.val(curr_value.fieldname);
				}
			});
		}

		$field_select.on("change", () => {
			let fetch_from = `${$doctype_select.val()}.${$field_select.val()}`;
			row.fetch_from = fetch_from;
			frm.dirty();
		});

		if (curr_value.doctype) {
			$doctype_select.val(curr_value.doctype);
			update_fieldname_options();
		}
	}
});
