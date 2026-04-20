<template>
  <v-container class="py-8" fluid>
    <v-row>
      <v-col cols="12" lg="8">
        <v-sheet class="pa-6" rounded="sm" border>
          <div class="text-overline text-primary mb-2">Documents Module</div>
          <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
            DocMan is joining the Resonance command suite.
          </h1>
          <p class="text-body-1 text-medium-emphasis mb-6">
            This Vue and Vuetify foundation is the first migration surface. The
            existing React app remains available while documents, reviews,
            teams, projects, and admin workflows move into the shared suite UI.
          </p>
          <div class="d-flex flex-wrap ga-3">
            <v-btn color="primary" prepend-icon="mdi-file-document-plus">
              New document
            </v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-view-dashboard-outline">
              Review dashboard
            </v-btn>
          </div>
        </v-sheet>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card title="Migration Status" subtitle="Foundation">
          <v-list density="comfortable">
            <v-list-item
              prepend-icon="mdi-check-circle-outline"
              title="Vue app shell"
              subtitle="Created beside the React frontend"
            />
            <v-list-item
              prepend-icon="mdi-check-circle-outline"
              title="Vuetify theme"
              subtitle="Initial Resonance palette and component defaults"
            />
            <v-list-item
              prepend-icon="mdi-progress-clock"
              title="Feature parity"
              subtitle="Documents, auth, and admin screens still need ports"
            />
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

